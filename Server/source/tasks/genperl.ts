import * as child_process from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as moment from 'moment'
import { IConfig } from './../config'
import { TaskType, TaskTypeOptionsGenperl, TaskInputGenperl, TaskOutputGenperl } from './../messages'
import { Task } from './base'


/** Task implementation for Genperl. */
export class TaskGenperl extends Task<TaskInputGenperl, TaskOutputGenperl> {
	private static strDefault = 'Default'
	private procGenperl: child_process.ChildProcess
	type: TaskType = 'Genperl'

	// Helper methods for logging.
	private logInfo = (text: string) => this.addLogItem({date: moment().toISOString(), type: 'Info', text: text})
	private logError = (text: string) => this.addLogItem({date: moment().toISOString(), type: 'Error', text: text})

	/** Get task type options. May throw error if parsing directory fails. */
	static getTaskTypeOptions = (config: IConfig): TaskTypeOptionsGenperl => {
		const versionPattern = 'v[0-9]{4}'
		const isDirectory = (source: string) => fs.lstatSync(source).isDirectory()
		const isValidVersion = (source: string) => new RegExp(versionPattern).test(source.toLowerCase())
		const getVersionsFromDir = (source: string) => {
			return fs.readdirSync(source)
				.map(name => path.join(source, name))
				.filter(path => isDirectory(path) && isValidVersion(path))
				.map(source => source.split(path.sep).pop())
				.sort().reverse()
		}
		try {
			// Empty string for default version, or any valid version directory.
			let strDefault = TaskGenperl.strDefault
			let gensimulVersions = [strDefault].concat(getVersionsFromDir(config.tasks.genperl.pathVersionsGensimul))
			let gensimulVersionsDev = [strDefault].concat(getVersionsFromDir(config.tasks.genperl.pathVersionsGensimulDev))
			let dynamoVersions = [strDefault].concat(getVersionsFromDir(config.tasks.genperl.pathVersionsDynamo))
			let dynamoVersionsDev = [strDefault].concat(getVersionsFromDir(config.tasks.genperl.PathVersionsDynamoDev))
			return {
				gensimulVersions, gensimulVersionsDev, dynamoVersions, dynamoVersionsDev
			}
		} catch (err) {
			let errText = (err as Error).message
			throw new Error(`Failed to parse gensimul and dynamo version directories, please check Genserver config. Original error: ${errText}`)
		}	
	}

	/** Read given gendsc file and extract path to output. */
	private readPathOutput = (pathGendsc: string) => {
		let lines = [] as string[]
		try {
			lines = fs.readFileSync(pathGendsc).toString().split('\n')
		} catch(err) {
			let error = err as Error
			this.logError(`Failed to read file ${pathGendsc}: ${error.message}`)
			return {success: false, pathOutput: ''}
		}
		let valueOutdir = lines
			.filter(line => line.includes('='))
			.map(line => {
				let parts = line.split('=')
				return {
					key: parts[0].toLowerCase().trim(), 
					value: parts[1].split('|')[0].trim()
				}
			})
			.filter(s => s.key == 'a012' || s.key == 'output directory')
			.reduce<string>((a,b) => b.value, null)
		if (valueOutdir == null) {
			this.logError(`No output directory setting found in gendsc file ${pathGendsc}.`)
			return {success: false, pathOutput: ''}
		} else {
			return {success: true, pathOutput: path.resolve(path.dirname(pathGendsc), valueOutdir)}
		}
	}

	/** After Genperl finishes, set permissions on out dir and fill task output. 
		Returns true iff this is considered a successful finish. */
	private handleGenperlFinish = (exitCode: number) => {
		let pathOutput = this.output.pathOutput
		this.logInfo(`Parsing output directory: '${pathOutput}'.`)
		
		// Check output directory exists, return if error.
		if (!fs.existsSync(pathOutput)) {
			this.logError(`Output directory does not exist.`)
			return false
		}

		// Set permissions on output directory, return if error. 
		// TODO: Remove in OCGUPSTR-967.
		this.logInfo(`Setting permissions on output directory.`)
		try {
			fs.chmodSync(pathOutput, '777')
		} catch (err) {
			let error = err as Error
			this.logError(`Failed to change permissions: ${error.message}`)
			return false
		}

		// List filenames in output directory, descending by last modified. Return if error.
		try {
			this.output.filesOutput = fs
				.readdirSync(pathOutput)
				.map(filename => ({
					filename: filename, 
					lastModTime: fs.statSync(path.resolve(pathOutput, filename)).mtime.getTime()
				}))
				.sort((a, b) => b.lastModTime - a.lastModTime)
				.map(v => v.filename)
		} catch (err) {
			let error = err as Error
			this.logError(`Failed to list files in output directory: ${error.message}`)
			return false
		}

		// Read contents of log file.
		let nameLogfile = this.output.filesOutput.find(name => name.toLowerCase().endsWith('_log.txt'))
		if (nameLogfile) {
			try {
				let pathLogfile = path.resolve(pathOutput, nameLogfile)
				this.output.contentsLogTextFile = fs.readFileSync(pathLogfile, 'utf8')
			} catch (err) {
				let error = err as Error
				this.logError(`Failed to read ${nameLogfile}: ${error.message}`)
			}
		}

		// Read contents of error file.
		let nameErrorfile = this.output.filesOutput.find(name => name.toLowerCase().endsWith('_err.txt'))
		if (nameErrorfile) {
			try {
				let pathErrorfile = path.resolve(pathOutput, nameErrorfile)
				this.output.contentsErrorTextFile = fs.readFileSync(pathErrorfile, 'utf8')
			} catch (err) {
				let error = err as Error
				this.logError(`Failed to read ${nameErrorfile}: ${error.message}`)
			}
		}

		// Run is considered successful iff not in error status and Genperl exitcode is 0 and no error above.
		let success = (this.status != 'Error') && (exitCode == 0)
		return success
	}

	/** Start this task. */
	start = async () => {
		this.output = {
			pathOutput: '',
			filesOutput: [],
			contentsLogTextFile: '',
			contentsErrorTextFile: ''
		}
		this.setStatus('Running')

		// Read pathOutput from gendsc file, return if error.
		let {success, pathOutput} = this.readPathOutput(this.input.pathGendsc)
		if (!success) {			
			this.setStatus('Error')
			return
		}
		this.logInfo(`Expected GenSimul output directory is '${pathOutput}'.`)
		this.output.pathOutput = pathOutput

		// If Genserver is running on Windows, skip Genperl and assume output exists for testing purposes.
		if (process.platform == 'win32') {
			this.logError('Genperl is not available because server is running on Windows. Remainder is for testing purposes.')
			let waitSeconds = 5
			this.logInfo(`Timeout of ${waitSeconds}s to simulate running process.`)
			await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000)) 
			let success = this.handleGenperlFinish(0)
			this.setStatus(success ? 'Success' : 'Error')
			return
		}

		// Helper method to check if given version is valid.
		let isDefaultVersion = (v: string) => (v == '') || (v == TaskGenperl.strDefault)

		let argGendsc = 
			`-f "${path.resolve(this.input.pathGendsc)}"`
		let argLocal = this.input.runLocal ? 
			'-loc' : ''
		let argGensimulDev = this.input.useGensimulDev ?
			'-dev' : ''
		let argGensimulVersion = !isDefaultVersion(this.input.gensimulVersion) ? 
			`-g ${this.input.gensimulVersion}` : ''
		let argDynamo = this.input.useDynamo && isDefaultVersion(this.input.dynamoVersion) ? 
			'-dynamo' : ''
		let argDynamoDev = this.input.useDynamoDev ? 
			'-ddev' : ''
		let argDynamoVersion = this.input.useDynamo && !isDefaultVersion(this.input.dynamoVersion) ?  
			`-d ${this.input.dynamoVersion}` : ''
		let cmd = `/apps/3rdparty-ep/share/genperl`
		let args = [argGendsc, argLocal, argGensimulDev, argGensimulVersion, argDynamo, argDynamoDev, argDynamoVersion]
		let options = {
			shell: true, 
			windowsHide: true
		}
		this.logInfo(`Executing ${cmd} ${args.join(' ')}.`)
		let procGenperl = child_process.spawn(cmd, args, options as any)
		procGenperl.stdout.on('data', (data) => {
			this.logInfo(data.toString())
		})
		procGenperl.stderr.on('data', (data) => {
			this.logError(data.toString())
		})
		procGenperl.on('close', (code) => {
			this.logInfo(`Genperl finished with exitcode ${code}.`)
			let success = this.handleGenperlFinish(code)
			this.setStatus(success ? 'Success' : 'Error')
		})
		procGenperl.on('error', (error) => {
			this.logError(error.message)
		})
		this.procGenperl = procGenperl
	}

	/** Stop this task. Sets status to error since this task should finish by itself. */
	stop = async () => {
		this.logInfo('User requested to stop task.')
		this.setStatus('PendingStop')
		const isRunning = () => {
			if (!this.procGenperl) return false
			try {
				process.kill(this.procGenperl.pid, 0)   // Signal 0 used to check if process is running. 
				return true
			} catch (err) {
				return false
			}
		}
		if (isRunning()) {   // Try to exit gracefully, long timeout for Genperl to close other processes. 
			process.kill(this.procGenperl.pid, 'SIGTERM')
			await new Promise(resolve => setTimeout(resolve, 3000)) 
		}
		if (isRunning()) {   // Try force exit a few times with small delay in between. 
			for (let i = 0; i < 5; i++) {
				process.kill(this.procGenperl.pid, 'SIGKILL')
				await new Promise(resolve => setTimeout(resolve, 1000))
				if (!isRunning()) break
			}
		}
		if (isRunning()) {
			this.logError('Failed to kill Genperl process, please contact server administrator.')
		} else {
			this.logInfo('Task stopped.')
		}		
		this.setStatus('Error')
	}
}



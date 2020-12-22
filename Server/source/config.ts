import * as path from 'path'
import { readFileSync, existsSync } from 'fs' 
import { ILogger, LogLevel } from './logging'

/** Describes possible modes. */
type Mode = 'Production' | 'Development'

/**
 * Helper method to find current Mode from NODE_ENV environment variable.
 */
const getNodeEnvMode = () => {
    let nodeEnv = process.env.NODE_ENV
    let isProduction = nodeEnv && (nodeEnv.toLowerCase() === 'production')
    return isProduction ? 'Production' : 'Development' as Mode
}

/**
 * Helper method to read package.json file and return contents as plain object.
 * @param pathPackageJson Full path to package.json file.
 */
const getPackageJson = (pathPackageJson: string) => {
    if (existsSync(pathPackageJson)) {
        let contents = readFileSync(pathPackageJson).toString()
        return JSON.parse(contents)
    } else {
        throw new Error(`Failed to read package.json: File not found '${pathPackageJson}'`)
    }
}

/** Describes server configuration. Some of these can be set by the config file. 
    Don't forget to update relevant documentation! */
export interface IConfig {
	pathRoot: string
	mode: Mode
	version: string
	configFileFound: boolean
	logging: {
		console: {
			minLogLevel: 'Info'|'Warning'|'Error'   // User-configurable.
		},
		file: {
			enabled: boolean   // User-configurable.
			minLogLevel: 'Info'|'Warning'|'Error'   // User-configurable.
			path: string   // User-configurable.
		}
	}
	server: {
		portHttp: number   // User-configurable.
		portWs: number   // User-configurable.
		pathPublic: string   // User-configurable.
	}
	tasks: {
		path: string   // User-configurable.
		genperl: {
			pathVersionsGensimul: string   // User-configurable.
			pathVersionsGensimulDev: string   // User-configurable.
			pathVersionsDynamo: string   // User-configurable.
			PathVersionsDynamoDev: string   // User-configurable.
		}
		deleteTaskAfterDays: number   // User-configurable.
	}
}


/** Helper class to provide IConfig functionality. */
export class ConfigManager {
    private static fileNameConfig = 'genserver.config.json'
    private static pathRoot = __dirname
    private static pathConfig = path.resolve(ConfigManager.pathRoot, ConfigManager.fileNameConfig)
    private static pathPackageJson = path.resolve(ConfigManager.pathRoot, './package.json')
    private static version = getPackageJson(ConfigManager.pathPackageJson).version as string
	private static mode = getNodeEnvMode()
	
	private static defaultConfig: IConfig = {
        pathRoot: ConfigManager.pathRoot,
		mode: ConfigManager.mode,
		version: ConfigManager.version, 
		configFileFound: false,
		logging: {
			console: {
				minLogLevel: 'Warning'
			},
			file: {
				enabled: true,
				minLogLevel: 'Info',
				path: '../logs'
			}
		},
		server: {
			portHttp: ConfigManager.mode == 'Production' ? 3001 : 3000,
			portWs: ConfigManager.mode == 'Production' ? 8081 : 8080,
			pathPublic: '../../client/public'
		},
		tasks: {
			path: '../tasks',
			genperl: {
				pathVersionsGensimul: '', 
				PathVersionsDynamoDev: '',
				pathVersionsDynamo: '',
				pathVersionsGensimulDev: ''
			}, 
			deleteTaskAfterDays: 7
		}
	}

	/** Return an IConfig object. Reads config file if it exists. 
	    All paths will be made absolute. */
	static getConfig = () => {
		let config = ConfigManager.defaultConfig
		let file = ConfigManager.pathConfig
		if (existsSync(file)) {
			let userConfig = JSON.parse(readFileSync(file).toString())
			config = {...config, ...userConfig}
			config.configFileFound = true
		}
		const makeAbsolute = (source: string) => {
			return path.resolve(config.pathRoot, source)
		}
		config.logging.file.path = makeAbsolute(config.logging.file.path)
		config.server.pathPublic = makeAbsolute(config.server.pathPublic)
		config.tasks.path = makeAbsolute(config.tasks.path)
		config.tasks.genperl.pathVersionsGensimul = makeAbsolute(config.tasks.genperl.pathVersionsGensimul)
		config.tasks.genperl.pathVersionsGensimulDev = makeAbsolute(config.tasks.genperl.pathVersionsGensimulDev)
		config.tasks.genperl.pathVersionsDynamo = makeAbsolute(config.tasks.genperl.pathVersionsDynamo)
		config.tasks.genperl.PathVersionsDynamoDev = makeAbsolute(config.tasks.genperl.PathVersionsDynamoDev)
		return config
	}

	/** Validate the given IConfig object. Generates warnings for unexpected input. */
	static validateConfig = (config: IConfig, logger: ILogger) => {
		if (config.configFileFound) {
			logger.log(LogLevel.Info, `Using config from ${ConfigManager.fileNameConfig}.`)
		} else {
			logger.log(LogLevel.Warning, `File not found: ${ConfigManager.fileNameConfig}. Reverting to defaults.`)
		} 
	}
}

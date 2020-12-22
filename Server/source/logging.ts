import * as path from 'path'
import * as fs from 'fs'
import * as moment from 'moment'
import { IConfig } from './config'


/** Log level options. */
export enum LogLevel {
	Info = 0,
	Warning = 1,
	Error = 2,
	Important = 3
}


/** Describes logging functionality. */
export interface ILogger {
	logHeader: () => void
	log: (level: LogLevel, message: string) => Promise<void>
	logEnd: () => void
}


/** Provides ILogger functionality using a number of concrete loggers. */
export class Logger implements ILogger {
	private loggers: ILogger[]

	/** Default constructor. */
	constructor(config: IConfig) {
		let minLevel = LogLevel[config.logging.console.minLogLevel]
		let loggerConsole = new LoggerConsole(minLevel)
		this.loggers = [loggerConsole]
		if (config.logging.file.enabled) {
			minLevel = LogLevel[config.logging.file.minLogLevel]
			let path = config.logging.file.path
			let loggerFile = new LoggerFile(path, minLevel)
			this.loggers.push(loggerFile)
		}
	}

	/** Log header lines. */
	logHeader = () => {
		this.loggers.forEach(
			logger => logger.logHeader()
		)
	}

	/** Log given line. */
	log = async (level: LogLevel, message: string) => {
		let promises = this.loggers.map(l => l.log(level, message))
		await Promise.all(promises)
	}

	/** Log ending lines. */
	logEnd = () => {
		this.loggers.forEach(
			logger => logger.logEnd()
		)
	}
}


/** Provides ILogger functionality via the console. */
class LoggerConsole implements ILogger {

	private minLogLevel: LogLevel
	/** See <http://patorjk.com/software/taag/>, font Roman. */
	private header = 
		"***************************************************************************************************\n" +
		"                                                                                                   \n" + 
		"   .oooooo.                           .oooooo..o                                                   \n" +
		"  d8P'  `Y8b                         d8P'    `Y8                                                   \n" +
		" 888            .ooooo.  ooo. .oo.   Y88bo.       .ooooo.  oooo d8b oooo    ooo  .ooooo.  oooo d8b \n" +
		" 888           d88' `88b `888P'Y88b   `'Y8888o.  d88' `88b `888''8P  `88.  .8'  d88' `88b `888''8P \n" +
		" 888     ooooo 888ooo888  888   888       `'Y88b 888ooo888  888       `88..8'   888ooo888  888     \n" +
		" `88.    .88'  888    .o  888   888  oo     .d8P 888    .o  888        `888'    888    .o  888     \n" +
		"  `Y8bood8P'   `Y8bod8P' o888o o888o 8''88888P'  `Y8bod8P' d888b        `8'     `Y8bod8P' d888b    \n" +
		"                                                                                                   \n" + 
		"***************************************************************************************************\n"

	private writeLogMessage = (message: string) => {
		let timestamp = moment().format('DD-MMM-YY HH:mm:ss')
		console.log(`[${timestamp}] ${message}`)
	}

	/** Default constructor. */
	constructor(minLogLevel: LogLevel) {
		this.minLogLevel = minLogLevel
	}

	/** Log header lines. */
	logHeader = () => {
		console.log(this.header)
	}

	/** Log given line. */
	log = async (level: LogLevel, message: string) => {
		if (level < this.minLogLevel) { return }
		let prefix = ''
		switch (level) {
			case LogLevel.Warning:
				prefix = 'Warning: '
				break
			case LogLevel.Error:
				prefix = 'ERROR: '
				break
		}
		this.writeLogMessage(prefix + message)
	}

	/** Log ending lines. */
	logEnd = () => {
		let timestamp = moment().format('DD-MMM-YY HH:mm:ss')
		this.writeLogMessage('Genserver exited.\n')
	}
}


/** Provides ILogger functionality via the file system. */
class LoggerFile implements ILogger {
	private minLogLevel: LogLevel
	private pathLogs: string

	/** Ensure log directory exists. */
	private initialize = () => {
		if (!fs.existsSync(this.pathLogs)) {
			fs.mkdirSync(this.pathLogs)
		}
	}

	/** Get full path to log file. Single log file per day. */
	private getLogFile = () => {
		let timestamp = moment().format('YYYYMMDD')
		return path.resolve(this.pathLogs, `./genserver-${timestamp}.log`)
	}

	/** Write a single log message to file. */
	private writeLogMessage = (message: string) => {
		let timestamp = moment().format('DD-MMM-YY HH:mm:ss')
		fs.appendFileSync(this.getLogFile(), `[${timestamp}] ${message}\n`)
	}

	/** Default contructor. */
	constructor(pathLogs: string, minLogLevel: LogLevel) {
		this.pathLogs = pathLogs
		this.minLogLevel = minLogLevel
	}

	/** Log header lines. */
	logHeader = () => {
		this.initialize()
		this.writeLogMessage('Genserver started.')
	}

	/** Log given line. */
	log = async (level: LogLevel, message: string) => {
		if (level < this.minLogLevel) { return }
		let prefix = ''
		switch (level) {
			case LogLevel.Warning:
				prefix = 'Warning: '
				break
			case LogLevel.Error: 
				prefix = 'ERROR: '
				break
		}
		this.writeLogMessage(prefix + message)
	}

	/** Log ending lines. */
	logEnd = () => {
		this.writeLogMessage('GenServer exited.\n')
	}
}

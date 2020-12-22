import { ConfigManager } from './config' 
import { Logger, LogLevel } from './logging'
import { ClientManager } from './clients'
import { TaskManager } from './taskmanager'
import { Server } from './server'


let config = ConfigManager.getConfig()
let logger = new Logger(config)
let clientManager = new ClientManager(logger)
let taskManager = new TaskManager(config, logger, clientManager)
let server = new Server(config, logger, clientManager, taskManager)

logger.logHeader()
logger.log(LogLevel.Important, `Version ${config.version}, ${config.mode} mode.`)
ConfigManager.validateConfig(config, logger)
server.run()

process.on('SIGINT', () => {
	logger.logEnd()
	process.exit()
})

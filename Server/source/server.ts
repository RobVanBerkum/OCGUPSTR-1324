import * as express from 'express'
import * as ws from 'ws'
import * as moment from 'moment'
import { CronJob } from 'cron'
import { IConfig } from './config'
import { ILogger, LogLevel } from './logging'
import { IClientManager } from './clients'
import { 
	TaskInfoItem,  
	IMessage, MessageFactory, 
	MessageServerLog, 
	MessageTokenRequest, MessageTokenResponse, 
	MessageTaskInfoRequest, MessageTaskInfoResponse, MessageTaskInfoSubscribe, MessageTaskCreateNew, MessageTaskControl, MessageTaskTypeOptionsResponse
} from './messages'
import { ITaskManager } from './taskmanager'


/** Setup http and websocket servers and handle traffic. */
export class Server {
	private config: IConfig
	private logger: ILogger
	private clientManager: IClientManager
	private taskManager: ITaskManager
	private httpServer: express.Express
	private wsServer: ws.Server

	/** Default constructor. */
	constructor(config: IConfig, logger: ILogger, clientManager: IClientManager, taskManager: ITaskManager) {
		this.config = config
		this.logger = logger
		this.clientManager = clientManager
		this.taskManager = taskManager
	}

	/** Start http and websocket servers. */
	run = () => {
		this.initializeHttp()
		this.initializeWs()
		this.initializeCronSchedule()
	}

	/** Start http server based on express package. */
	private initializeHttp = () => {
		let portHttp = this.config.server.portHttp
		let pathPublic = this.config.server.pathPublic
		this.httpServer = express()
		this.httpServer.use(express.static(pathPublic))
		this.httpServer.use((req, res) => {
			res.send('404: Page not found. Please check Genserver config.')
		})
		this.httpServer.listen(portHttp)
		this.logger.log(LogLevel.Important, `Listening for HTTP requests on port ${portHttp}.`)
		this.logger.log(LogLevel.Info, `Serving static assets from path:\n  ${pathPublic}.`)
	}

	/** Start websocket server based on ws package. */
	private initializeWs = () => {
		let portWs = this.config.server.portWs
		this.wsServer = new ws.Server({port: portWs})
		this.wsServer.on('connection', (wsClient) => {
			this.logger.log(LogLevel.Info, `WebSocket client connected. Total ${this.wsServer.clients.size} clients.`)
			let onClose = () => {
				this.logger.log(LogLevel.Info, `WebSocket client disconnected. Total ${this.wsServer.clients.size} clients.`)
			}
			let onError = (error: any) => {
				if ('code' in error && error.code == 'ECONNRESET') { return }   // Observed when user closes browser tab.
				this.logger.log(LogLevel.Error, 'Websocket client error: ${error}')
			}
			wsClient.on('close', onClose)   // Close event also fires after error event.
			wsClient.on('error', onError)
			wsClient.on('message', (data) => {this.handleWsMessage(wsClient, data)})
		})
		this.logger.log(LogLevel.Important, `Listening for WebSocket messages on port ${portWs}.`)
	}

	/** Schedule some server maintenance jobs via cron. */
	private initializeCronSchedule = () => {
		// Run every morning at 5:00.
		let taskCleaner = new CronJob('00 00 05 * * *', () => this.taskManager.cleanTasks())
		taskCleaner.start()
	}

	/** Handle a single incoming WebSocket message from given client. */
	private handleWsMessage = async (wsClient: ws, data: ws.Data) => {
		let msg: IMessage
		try {
			msg = MessageFactory.fromJson(data.toString())
		} catch (error) {
			this.logger.log(LogLevel.Warning, `Failed to handle message: ${(error as Error).message}`)
			return 
		}
		this.logger.log(LogLevel.Info, `WebSocket handling ${msg.type} with payload ${JSON.stringify(msg.payload, null, 2)}.`)
		try {
			// Any exception thrown from a message handler is considered an error. Handle warnings gracefully inside. 
			if (msg instanceof MessageTokenRequest) {await this.handleTokenRequest(wsClient, msg)}
			if (msg instanceof MessageTaskInfoRequest) {await this.handleTaskInfoRequest(wsClient, msg)}
			if (msg instanceof MessageTaskInfoSubscribe) {await this.handleTaskInfoSubscribe(wsClient, msg)}
			if (msg instanceof MessageTaskCreateNew) {await this.handleTaskCreateNew(wsClient, msg)}
			if (msg instanceof MessageTaskControl) {await this.handleTaskControl(wsClient, msg)}
		} catch (error) {
			let text = `Failed to handle ${msg.type}: ${(error as Error).message}`
			this.logger.log(LogLevel.Error, text)
			let feedback = new MessageServerLog({type: 'Error', date: moment().toISOString(), text: text})
			wsClient.send(MessageFactory.toJson(feedback))
		}
	}

	/** Handle an incoming token request. */
	private handleTokenRequest = async (wsClient: ws, msg: MessageTokenRequest) => {
		let response = new MessageTokenResponse({token: '', success: false})
		let clientId = msg.payload.clientId
		let clientExists = this.clientManager.validateClient(clientId)
		if (!clientExists) {
			this.handleWarning(wsClient, `Token request denied: Unknown client ${clientId}.`, `Invalid credentials.`)
		} else {
			let token = this.clientManager.generateToken(clientId)
			let client = this.clientManager.getClient(clientId)
			this.taskManager.setSubscription(token, {
				client: client, 
				defaultType: 'None',
				overloads: [],
				handler: (taskInfo) => this.sendTaskInfoUpdate(wsClient, taskInfo)
			})
			wsClient.addListener('close', () => {
				this.clientManager.deleteToken(token, clientId)
				this.taskManager.deleteSubscription(token)
			})
			response = new MessageTokenResponse({token: token, success: true})
		}
		wsClient.send(MessageFactory.toJson(response))
	}

	/** Handle an incoming task info request. */
	private handleTaskInfoRequest = async (wsClient: ws, msg: MessageTaskInfoRequest) => {
		let client = this.clientManager.tokenToClient(msg.payload.token)	
		let tasks = msg.payload.taskIds.length == 0 ? 
			this.taskManager.getTasksByClient(client) : 
			msg.payload.taskIds.map(taskId => this.taskManager.getTaskById(taskId))
		if (tasks.some(t => !t)) {
			let taskId = msg.payload.taskIds[tasks.findIndex(t => !t)]
			this.handleWarning(wsClient, `HandleTaskInfoRequest: Invalid taskId: '${taskId}'.`)
		} else {
			let infoItems = tasks.map(task => {
				let infoItem = task.toInfoItem(msg.payload.includeLogs, msg.payload.includeInput, msg.payload.includeOutput)
				if (msg.payload.includeLogs && msg.payload.logStartDate != '') {
					let startDate = moment.utc(msg.payload.logStartDate)
					infoItem.logs = infoItem.logs.filter(log => moment.utc(log.date).isAfter(startDate))
				}
				return infoItem
			})
			let response = new MessageTaskInfoResponse({infoItems})
			wsClient.send(MessageFactory.toJson(response))
		}
	}

	/** Handle an incoming task info subscribe message. */
	private handleTaskInfoSubscribe = async (wsClient: ws, msg: MessageTaskInfoSubscribe) => {
		let token = msg.payload.token
		let client = this.clientManager.tokenToClient(token)
		this.taskManager.updateSubscription(token, msg.payload.defaultType, msg.payload.overloads)
	}

	/** Handle an incoming request to create a new task. Respond with a task info or task options message. */
	private handleTaskCreateNew = async (wsClient: ws, msg: MessageTaskCreateNew) => {
		let client = this.clientManager.tokenToClient(msg.payload.token)
		if (!msg.payload.type) {
			let options = this.taskManager.getTaskTypeOptionsByClient(client)
			let response = new MessageTaskTypeOptionsResponse({taskOptions: options})
			wsClient.send(MessageFactory.toJson(response))
		} else {
			let task = this.taskManager.createTask(msg.payload.type, client, msg.payload.input)
			let response = new MessageTaskInfoResponse({infoItems: [task.toInfoItem()]})
			wsClient.send(MessageFactory.toJson(response))
			task.start()
		}
	}

	/** Handle an incoming task control message. */
	private handleTaskControl = async (wsClient: ws, msg: MessageTaskControl) => {
		let client = this.clientManager.tokenToClient(msg.payload.token)
		let task = this.taskManager.getTaskById(msg.payload.taskId)
		let status = task.toInfoItem().status
		switch (msg.payload.action) {
			case 'stop' : {
				if (status == 'PendingStart' || status == 'Running') {
					await task.stop()	
				}
				break
			}
			case 'delete': {
				if (status != 'PendingDelete') {
					await this.taskManager.deleteTask(task.id)
				}
				break
			}
		}
	}

	/** Helper method to log warnings and if required send feedback to client. */
	private handleWarning = (wsClient: ws, logText: string, feedbackText?: string) => {
		this.logger.log(LogLevel.Warning, logText)
		if (feedbackText) {
			let feedback = new MessageServerLog({type: 'Warning', date: moment().toISOString(), text: feedbackText})
			wsClient.send(MessageFactory.toJson(feedback))
		}
	}

	/** Helper method for sending task info update message. */
	private sendTaskInfoUpdate = (wsClient: ws, taskInfo: TaskInfoItem) => {
		let msg = new MessageTaskInfoResponse({infoItems: [taskInfo]})
		wsClient.send(MessageFactory.toJson(msg))
	}
}

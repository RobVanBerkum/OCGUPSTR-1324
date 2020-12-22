/** Ensure that this file has no imports so that it can be shared between client and server. */

/** Dates stored as string follow ISO 8601 format in UTC, see <https://momentjs.com/docs/>. */


/** A single log item. */
export type LogItem = {
	type: 'Info' | 'Warning' | 'Error'
	date: string
	text: string
}


/** Possible task types. */
export type TaskType = 'Genperl' | 'FolderWatch'


/** Possible task statuses. */
export type TaskStatus = 'Concept'|'PendingStart'|'Running'|'PendingStop'|'Success'|'Error'|'PendingDelete'


/** A single task info item. */
export type TaskInfoItem = {
	type: TaskType
	status: TaskStatus
	id: string 
	ownerClientId: string
	dateCreated: string
	description: string
	logs?: LogItem[]
	input?: TaskInput
	output?: TaskOutput
}


/** Possible task info subscription types. */
export type TaskInfoSubscriptionType = 'None'|'Summary'|'Detail'


/** Union type of all task type options. */
export type TaskTypeOptions = TaskTypeOptionsGenperl | TaskTypeOptionsFolderWatch


/** Union type of all task input types. Try to keep these types flat for storing in db later. */
export type TaskInput = TaskInputGenperl | TaskInputFolderWatch


/** Union type of all task output types. Try to keep these types flat for storing in db later. */
export type TaskOutput = TaskOutputGenperl | TaskOutputFolderWatch


/** Task type options for TaskGenperl. */
export type TaskTypeOptionsGenperl = {
	gensimulVersions: string[]
	gensimulVersionsDev: string[]
	dynamoVersions: string[]
	dynamoVersionsDev: string[]
}


/** Task type options for TaskFolderWatch. */
export type TaskTypeOptionsFolderWatch = {
	fileHandlers: ('GenperlStartfileHandler'|'TriggerTaskHandler')[]
	triggerTasks: {type: TaskType, propertyKey: string}[]
}


/** Input for TaskGenperl. */
export type TaskInputGenperl = {
	description: string
	pathGendsc: string
	runLocal: boolean
	useDynamo: boolean
	useGensimulDev: boolean
	useDynamoDev: boolean
	gensimulVersion: string
	dynamoVersion: string
}


/** Input for TaskFolderWatch. */
export type TaskInputFolderWatch = {
	description: string
	watchPath: string
	fileHandler: 'GenperlStartfileHandler'|'TriggerTaskHandler'
	triggerTaskType: TaskType
	triggerTaskInput: TaskInput
	triggerTaskPropertyKey: string
}


/** Output for TaskGenperl. */
export type TaskOutputGenperl = {
	pathOutput: string,
	filesOutput: string[]
	contentsLogTextFile: string,
	contentsErrorTextFile: string
}


/** Output for TaskFolderWatch. */
export type TaskOutputFolderWatch = {
	triggeredTasks: {filePath: string, taskType: TaskType, taskId: string}[]
}


/** Payload for message task info request. */
type PayloadTaskInfoRequest = {
	token: string
	taskIds: string[]
	includeLogs: boolean
	logStartDate: string
	includeInput: boolean
	includeOutput: boolean
}


/** Payload for message task info subscribe. */
type PayloadTaskInfoSubscribe = {
	token: string, 
	defaultType: TaskInfoSubscriptionType, 
	overloads: {taskId: string, type: TaskInfoSubscriptionType}[]
}


/** Collection of all message types. 
	When adding a new type, also provide an IMessage implementation. */
export enum MessageType {
	TokenRequest = 'TokenRequest', 
	TokenResponse = 'TokenResponse', 
	ServerLog = 'ServerLog', 
	TaskInfoRequest = 'TaskInfoRequest', 
	TaskInfoResponse = 'TaskInfoResponse', 
	TaskInfoSubscribe = 'TaskInfoSubscribe', 
	TaskCreateNew = 'TaskCreateNew', 
	TaskTypeOptionsResponse = 'TaskTypeOptionsResponse',
	TaskControl = 'TaskControl'
}


/** Every message adheres to this interface and must have a parameterless constructor. */
export interface IMessage {
	type: MessageType
	payload: any
}


/** Describes message handler for specific message class. */
export interface IMessageHandler<M extends IMessage> {
	(msg: M): void
}


/** Message to server requesting a token for given client. */
export class MessageTokenRequest implements IMessage {
	type = MessageType.TokenRequest
	payload = {clientId: ''}
	constructor(payload?: {clientId: string}) {
		if (payload) this.payload = payload
	}
}


/** Message from server responding to token request. */
export class MessageTokenResponse implements IMessage {
	type = MessageType.TokenResponse
	payload = {token: '', success: false}
	constructor(payload?: {token: string, success: boolean}) {
		if (payload) this.payload = payload
	}
}


/** Message from server with a log item. */
export class MessageServerLog implements IMessage {
	type = MessageType.ServerLog
	payload: LogItem = {type: 'Info', date: '', text: ''}
	constructor(payload?: LogItem) {
		if (payload) this.payload = payload
	}
}


/** Message to server with request for client task info. Options: 
	- If taskIds is empty, response includes info for all client tasks. 
	- If includeLogs is true, response includes task log items.
	- If logStartDate is set, response includes only later log items.
	- If includeInput is true, response includes task input. 
	- If includeOutput is true, response includes task output. */
export class MessageTaskInfoRequest implements IMessage {
	type = MessageType.TaskInfoRequest
	payload: PayloadTaskInfoRequest = {
		token: '', 
		taskIds: [], 
		includeLogs: false, 
		logStartDate: '', 
		includeInput: false, 
		includeOutput: false
	}
	constructor(payload?: PayloadTaskInfoRequest) {
		if (payload) this.payload = payload
	}
}


/** Message from server containing one or more task info items. It is expected in these cases: 
	- Response to task info request. 
	- Response to task create new. 
	- Client subscribed to task info updates. */
export class MessageTaskInfoResponse implements IMessage {
	type = MessageType.TaskInfoResponse
	payload: {infoItems: TaskInfoItem[]} = {infoItems: []}
	constructor(payload?: {infoItems: TaskInfoItem[]}) {
		if (payload) this.payload = payload
	}
}


/** Message to server for (un)subscribing to task updates. Options: 
	- defaultSubscription is set on all current and future tasks.
	- taskSubscriptions can be used to override subscriptions for specific tasks. */
export class MessageTaskInfoSubscribe implements IMessage {
	type = MessageType.TaskInfoSubscribe
	payload = {token: '', defaultType: 'None', overloads: []} as PayloadTaskInfoSubscribe
	constructor(payload?: PayloadTaskInfoSubscribe) {
		if (payload) this.payload = payload
	}
}


/** Message to server for starting new tasks. Overloads ensure task type and task input match. Options:
	- If type is non-empty, server sends task info response with id of created task.  
	- If type is empty, server sends task type options response. */
export class MessageTaskCreateNew implements IMessage {
	type = MessageType.TaskCreateNew
	payload = {token: '', type: null, input: null} as {
		token: string, 
		type: TaskType,
		input: TaskInput
	}
	constructor()
	constructor(payload: {token: string})
	constructor(payload: {token: string, type: 'Genperl', input: TaskInputGenperl})
	constructor(payload: {token: string, type: 'FolderWatch', input: TaskInputFolderWatch})
	constructor(payload: {token: string, type: TaskType, input: TaskInput}) 
	constructor(payload?: {token: string, type: TaskType, input: TaskInput}) {
		if (payload) this.payload = {...this.payload, ...payload}
	}
}


/** Message to server for controlling tasks, for example stop or delete. */
export class MessageTaskControl implements IMessage {
	type = MessageType.TaskControl
	payload = {token: '', taskId: '', action: '' as 'stop'|'delete'}
	constructor(payload?: {token: string, taskId: string, action: 'stop'|'delete'}) {
		if (payload) this.payload = payload
	}
}


/** Message from server with collection of task options, describes which task types can be
	created by client and their relevant input options. It is expected in these cases: 
	- Response to task create new. */
export class MessageTaskTypeOptionsResponse implements IMessage {
	type = MessageType.TaskTypeOptionsResponse
	payload = {
		taskOptions: [] as {type: TaskType, options: TaskTypeOptions}[]		
	}
	constructor(payload?: {taskOptions: {type: TaskType, options: TaskTypeOptions}[]}) {
		if (payload) this.payload = payload
	}
}


/** Helper functions for converting to and from JSON format. If you use non-primitive types 
	in the message payloads, change these implementations accordingly. */
export class MessageFactory {
	
	/** Collection of all message constructors per type. */
	private static readonly constructorByType: {[key in MessageType]: {new(): IMessage}  } = {
		TokenRequest: MessageTokenRequest, 
		TokenResponse: MessageTokenResponse, 
		ServerLog: MessageServerLog, 
		TaskInfoRequest: MessageTaskInfoRequest, 
		TaskInfoResponse: MessageTaskInfoResponse, 
		TaskInfoSubscribe: MessageTaskInfoSubscribe, 
		TaskCreateNew: MessageTaskCreateNew, 
		TaskTypeOptionsResponse: MessageTaskTypeOptionsResponse, 
		TaskControl: MessageTaskControl
	}

	/** Convert given message to JSON string. */
	static toJson(msg: IMessage): string {
		return JSON.stringify(msg)
	}

	/** Convert given string to an actual IMessage instance. Throws error if parsing fails. 
	    Note it only does shallow check on payload. (Nested properties are assumed correct.) */
	static fromJson(jsonString: string): IMessage {
		let obj = {} as any
		try {
			obj = JSON.parse(jsonString) 
		} catch (error) {
			throw new Error(`Failed to parse message ${jsonString}: Invalid JSON.`)
		}
		if (!('type' in obj)) throw new Error(`Failed to parse message ${jsonString}: No type.`)
		if (!('payload' in obj)) throw new Error(`Failed to parse message ${jsonString}: No payload.`)
		let msgType = obj.type as MessageType
		if (!(msgType in MessageType)) throw new Error(`Failed to parse message ${jsonString}: Unsupported type.`)
		let msg = new MessageFactory.constructorByType[msgType]()
		for (let key in msg.payload) { 
			if (!(key in obj.payload)) throw new Error(`Failed to parse message ${jsonString}: Payload does not contain value for key ${key}.`)
			msg.payload[key] = obj.payload[key]
		}
		return msg
	}
}

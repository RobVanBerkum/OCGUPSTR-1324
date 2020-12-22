import * as events from 'events'
import * as moment from 'moment'
import { 
	LogItem, 
	TaskType, TaskTypeOptions, TaskStatus, TaskInfoItem,  
	TaskInput, TaskOutput
} from './../messages'
import { IClient } from './../clients'
import { IConfig } from './../config'



/** Possible task events. */
export enum TaskEvent {
	Log = 'Log',
	StatusChange = 'StatusChange'
}


/** Abstract base task implementation. */
export abstract class Task<I extends TaskInput, O extends TaskOutput> extends events.EventEmitter {
	abstract readonly type: TaskType
	readonly id: string
	readonly owner: IClient
	readonly dateCreated: moment.Moment
	protected status: TaskStatus
	protected input: I
	protected output: O
	private logs: LogItem[]


	/** Default constructor. */
	constructor(owner: IClient, input: I) {
		super()
		this.status = 'PendingStart'
		this.id = `${moment().format('YYMMDDHHmmssSSS')}`
		this.owner = owner
		this.dateCreated = moment()
		this.logs = []
		this.input = input
	}

	/** Overloads for all add event listener methods. */
	addListener(event: TaskEvent.Log, listener: (task: Task<I, O>) => void): this 
	addListener(event: TaskEvent.StatusChange, listener: (task: Task<I, O>) => void): this 
	addListener(event: TaskEvent, listener: any): this {
		super.addListener(event, listener)
		return this
	}

	/** Overloads for all remove event listener methods. */
	removeListener(event: TaskEvent.Log, listener: (task: Task<I, O>) => void): this
	removeListener(event: TaskEvent.StatusChange, listener: (task: Task<I, O>) => void): this
	removeListener(event: TaskEvent, listener: any): this {
		super.removeListener(event, listener)
		return this
	}

	/** Overloads for all emit event methods. */
	emit(event: TaskEvent.Log, task: Task<I, O>): boolean
	emit(event: TaskEvent.StatusChange, task: Task<I, O>): boolean
	emit(event: TaskEvent, task: Task<I, O>) {
		return super.emit(event, task)
	}

	/** Map this task to task info item. */
	toInfoItem = (includeLogs = false, includeInput = false, includeOutput = false) => {
		let infoItem: TaskInfoItem = {
			type: this.type, 
			status: this.status, 
			id: this.id, 
			ownerClientId: this.owner.id, 
			dateCreated: this.dateCreated.toISOString(),
			description: this.input ? this.input.description : '',
			logs: includeLogs ? this.logs : null,
			input: includeInput ? this.input : null, 
			output: includeOutput ? this.output : null 
		}
		return infoItem
	}

	/** Stop task if running and set status to pending delete. */
	flagForDelete = async () => {
		if (this.status == 'PendingStart' || this.status == 'Running') {
			await this.stop()
		}
		if (this.status != 'PendingDelete') {
			this.setStatus('PendingDelete')
		}
	}

	/** Add a log item. Emits log event. */
	protected addLogItem = (logItem: LogItem) => {
		this.logs.push(logItem)
		this.emit(TaskEvent.Log, this)
	}

	/** Set status. Emits status change event. */
	protected setStatus = (newStatus: TaskStatus) => {
		if (this.status != newStatus) {
			this.status = newStatus
			this.emit(TaskEvent.StatusChange, this)
		}
	}

	/** Get task type options. */
	static getTaskTypeOptions: (config: IConfig) => TaskTypeOptions

	/** Start this task. */
	abstract start: () => Promise<void>

	/** Stop this task. */
	abstract stop: () => Promise<void>
}

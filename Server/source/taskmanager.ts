import * as moment from 'moment'
import { IConfig } from './config'
import { ILogger, LogLevel } from './logging'
import { 
	TaskType, TaskInfoItem,  TaskInfoSubscriptionType, 
	TaskTypeOptions, TaskInput, TaskOutput, 
	TaskInputGenperl,  
	TaskInputFolderWatch
} from './messages'
import { IClient, ClientType, IClientManager } from './clients'
import { Task, TaskEvent } from './tasks/base'
import { TaskGenperl } from './tasks/genperl'
import { TaskFolderWatch } from './tasks/folderwatch'


/** Describes a subscription, used to push task info (detail or summary) to clients. */
type Subscription = {
	client: IClient
	defaultType: TaskInfoSubscriptionType
	overloads: {taskId: string, type: TaskInfoSubscriptionType}[]
	handler: (infoItem: TaskInfoItem) => void
}


/** Describes task manager functionality. 
	Future improvement: Use database like sqlite3 for persistent task info storage. */
export interface ITaskManager {
	createTask: (type: TaskType, owner: IClient, input: TaskInput) => Task<TaskInput, TaskOutput>
	deleteTask: (taskId: string) => Promise<void>
	cleanTasks: () => Promise<void>
	getTaskById: (taskId: string) => Task<TaskInput, TaskOutput>
	getTasksByClient: (client: IClient) => Task<TaskInput, TaskOutput>[]
	getTaskTypeOptionsByClient: (client: IClient) => {type: TaskType, options: TaskTypeOptions}[]
	setSubscription: (id: string, subscription: Subscription) => void
	updateSubscription: (id: string, defaultType: TaskInfoSubscriptionType, overloads: {taskId: string, type: TaskInfoSubscriptionType}[]) => void
	deleteSubscription: (id: string) => void
}


/** Provides task manager functionality. Do not construct tasks directly but use this class instead. */
export class TaskManager implements ITaskManager {
	private config: IConfig
	private logger: ILogger
	private clientManager: IClientManager
	private tasks: Map<string, Task<TaskInput, TaskOutput>>
	private subscriptionsById: Map<string, Subscription>

	/** Default constructor. */
	constructor(config: IConfig, logger: ILogger, clientManager: IClientManager) {
		this.config = config
		this.logger = logger
		this.clientManager = clientManager
		this.tasks = new Map()
		this.subscriptionsById = new Map()
	}

	/** Call relevant detail subscription handlers. Pass taskInfo with only latest log item. */
	private handleSubscriptionsOnTaskLog = (task: Task<TaskInput, TaskOutput>) => {
		this.subscriptionsById.forEach(s => {
			let matchesClient = (s.client.type == ClientType.Admin) || (s.client.id == task.owner.id)
			let overload = s.overloads.find(v => v.taskId == task.id)
			let type = overload ? overload.type : s.defaultType
			if (matchesClient && type == 'Detail') {
				let logs = task.toInfoItem(true, false, false).logs
				let taskInfo = {...task.toInfoItem(), logs: logs.slice(logs.length - 1)}
				s.handler(taskInfo)
			}
		})
	}

	/** Call relevant summary or detail subscription handlers. If task finished, include task output in detail handlers. */
	private handleSubscriptionsOnTaskStatusChange = (task: Task<TaskInput, TaskOutput>) => {
		this.subscriptionsById.forEach(s => {
			let matchesClient = (s.client.type == ClientType.Admin) || (s.client.id == task.owner.id)
			let overload = s.overloads.find(v => v.taskId == task.id)
			let type = overload ? overload.type : s.defaultType
			if (matchesClient && type != 'None') {
				let includeOutput = (type == 'Detail')
				let taskInfo = task.toInfoItem(false, false, includeOutput)
				s.handler(taskInfo)
			}
		})
	}

	/** Log overview remaining tasks when a task finishes. */
	private handleTaskFinishOnTaskStatusChange = (task: Task<TaskInput, TaskOutput>) => {
		let newStatus = task.toInfoItem().status
		if (newStatus == 'Success' || newStatus == 'Error') {
			this.logger.log(LogLevel.Info, `Task finished with status ${newStatus}: ${task.type} (${task.id}).`)
			this.logTaskOverview()
		}
	}

	/** Log current task overview. */
	private logTaskOverview = () => {
		let tasksUnfinished = Array.from(this.tasks.values())
			.filter(t => {
				let status = t.toInfoItem().status
				return (status != 'Success' && status != 'Error')
			})
		this.logger.log(LogLevel.Info, `Task overview: ${tasksUnfinished.length} (busy) / ${this.tasks.size} (total)`)
	}

	/** Create a task from given arguments, add it to manager and return it. */
	createTask = (type: TaskType, owner: IClient, input: TaskInput) => {
		let task: Task<TaskInput, TaskOutput>
		switch (type) {
			case 'Genperl':
				task = new TaskGenperl(owner, (input as TaskInputGenperl))
				break
			case 'FolderWatch':
				let newOwner = this.clientManager.getClient('User')   // TODO: Better approach is defining task rights (View/Create/Delete) per ClientType.
				const createTaskCallback = (newType: TaskType, newInput: TaskInput) => this.createTask(newType, newOwner, newInput)
				task = new TaskFolderWatch(owner, (input as TaskInputFolderWatch), createTaskCallback)
				break 
		}
		task.addListener(TaskEvent.Log, this.handleSubscriptionsOnTaskLog)
		task.addListener(TaskEvent.StatusChange, this.handleSubscriptionsOnTaskStatusChange)
		task.addListener(TaskEvent.StatusChange, this.handleTaskFinishOnTaskStatusChange)
		this.tasks.set(task.id, task)
		this.logger.log(LogLevel.Info, `Task created: ${task.type} (${task.id}).`)
		this.logTaskOverview()
		return task
	}

	/** Delete task for given task id. */
	deleteTask = async (taskId: string) => {
		let task = this.getTaskById(taskId)
		await task.flagForDelete()
		this.tasks.delete(task.id)
		this.logger.log(LogLevel.Info, `Task ${task.type} with id ${task.id} deleted.`)
	}

	/** Delete old tasks to free up server resources. */
	cleanTasks = async () => {
		this.logger.log(LogLevel.Info, `Taskmanager started cleaning tasks.`)
		let maxDays = this.config.tasks.deleteTaskAfterDays
		for (let task of this.tasks.values()) {
			let doClean = 
				(task.owner.type != ClientType.Admin) &&  
				(task.dateCreated.diff(moment(), 'days') >= maxDays)
			if (doClean) {
				await this.deleteTask(task.id)
			}
		}
		this.logger.log(LogLevel.Info, `Taskmanager finished cleaning.`)
	}

	/** Return task for given task id. */
	getTaskById = (taskId: string) => {
		return this.tasks.get(taskId)
	}

	/** Return array of tasks for given client. 
		Admin gets all tasks, User only gets own tasks. */
	getTasksByClient = (client: IClient) => {
		let result = [...this.tasks.values()]
		if (client.type == ClientType.User) {
			result = result.filter(t => t.owner.id == client.id)
		}
		return result
	}

	/** Return array of task type options for given client. 
		Admin can start more tasks than User. */
	getTaskTypeOptionsByClient = (client: IClient): {type: TaskType, options: TaskTypeOptions}[] => {
		let result: {type: TaskType, options: TaskTypeOptions}[] = []
		if (client.type == ClientType.User || client.type == ClientType.Admin) {
			result.push({type: 'Genperl', options: TaskGenperl.getTaskTypeOptions(this.config)})
		}
		if (client.type == ClientType.Admin) {
			result.push({type: 'FolderWatch', options: TaskFolderWatch.getTaskTypeOptions()})
		}
		return result
	}

	/** Set subscription to task updates. */
	setSubscription = (id: string, subscription: Subscription) => {
		this.subscriptionsById.set(id, subscription)
	}

	/** Change subscription types for some existing subscription. */
	updateSubscription = (id: string, defaultType: TaskInfoSubscriptionType, overloads: {taskId: string, type: TaskInfoSubscriptionType}[]) => {
		let s = this.subscriptionsById.get(id)
		s.defaultType = defaultType
		s.overloads = overloads
		this.subscriptionsById.set(id, s)
	}

	/** Remove subscription. */
	deleteSubscription = (id: string) => {
		this.subscriptionsById.delete(id)
	}
}

import * as moment from 'moment'
import { Dispatch } from './store'
import { RootState, ConnectionStatus } from './state'
import { 
	LogItem, TaskInfoItem, TaskInfoSubscriptionType, TaskType, TaskTypeOptions, TaskStatus, TaskInput, 
	MessageTokenRequest, MessageTokenResponse,
	MessageServerLog,
	MessageTaskInfoRequest, MessageTaskInfoResponse, MessageTaskInfoSubscribe, 
	MessageTaskCreateNew, MessageTaskTypeOptionsResponse, MessageTaskControl
} from './../messaging/messages'
import { Communicator } from './../messaging/communicator'


/** Simple actions that are used in reducers to update Redux state. */
export enum ActionType {
	ServerSetInfo = 'ServerSetInfo', 
	ServerAddLogItem = 'ServerAddLogItem', 
	ServerClearInfo = 'ServerClearInfo', 
	TaskSetTypeOptions = 'TaskSetTypeOptions', 
	TaskAdd = 'TaskAddInfo',
	TaskUpdate = 'TaskUpdateInfo', 
	TaskDelete = 'TaskDelete', 
	TaskSetFilter = 'TaskSetFilter',
	TaskSelectIds = 'TaskSelectIds'
}


/** Action to set server info. */
interface ServerSetInfoAction {
	type: ActionType.ServerSetInfo
	connectionStatus: ConnectionStatus
	connectionDate?: string
	clientId?: string
	token?: string
}


/** Action to add log item to server info. */
interface ServerAddLogItemAction {
	type: ActionType.ServerAddLogItem
	logItem: LogItem
}


/** Action to clear all server info and possibly log items. */
interface ServerClearInfoAction {
	type: ActionType.ServerClearInfo
	clearLogs: boolean
}


/** Action to set task type options. */
interface TaskSetTypeOptionsAction {
	type: ActionType.TaskSetTypeOptions
	taskOptions: {type: TaskType, options: TaskTypeOptions}[]
}


/** Action to add task info. */
interface TaskAddAction {
	type: ActionType.TaskAdd
	infoItem: TaskInfoItem
}

/** Action to update task info. */
interface TaskUpdateAction {
	type: ActionType.TaskUpdate
	infoItem: TaskInfoItem
}


/** Action to delete all task data for given id. */
interface TaskDeleteAction {
	type: ActionType.TaskDelete
	taskId: string
}


/** Action to set task filter. */
interface TaskSetFilterAction {
	type: ActionType.TaskSetFilter
	filter: {key: keyof TaskInfoItem, type: 'category'|'string', values: string[]}
}


/** Action to select tasks by id. */
interface TaskSelectIdsAction {
	type: ActionType.TaskSelectIds
	ids: string[]
}


/** Union type of all actions. */
export type RootAction = 
	ServerSetInfoAction | 
	ServerAddLogItemAction | 
	ServerClearInfoAction | 
	TaskSetTypeOptionsAction | 
	TaskAddAction |
	TaskUpdateAction |  
	TaskDeleteAction | 
	TaskSetFilterAction | 
	TaskSelectIdsAction


/** Action creator for ServerSetInfoAction. */
const serverSetInfo = (info: {connectionStatus: ConnectionStatus, connectionDate?: string, clientId?: string, token?: string}): ServerSetInfoAction => ({
	type: ActionType.ServerSetInfo,
	connectionStatus: info.connectionStatus,
	connectionDate: info.connectionDate, 
	clientId: info.clientId, 
	token: info.token
})


/** Action creator for ServerAddLogItemAction. */
const serverAddLogItem = (logItem: LogItem): ServerAddLogItemAction => ({
	type: ActionType.ServerAddLogItem,
	logItem: logItem
})


/** Action creator for ServerClearInfoAction. */
const serverClearInfo = (clearLogs: boolean): ServerClearInfoAction => ({
	type: ActionType.ServerClearInfo, 
	clearLogs: clearLogs
})


/** Action creator for TaskSetTypeOptionsAction. */
const taskSetTypeOptions = (taskOptions: {type: TaskType, options: TaskTypeOptions}[]): TaskSetTypeOptionsAction => ({
	type: ActionType.TaskSetTypeOptions, 
	taskOptions: taskOptions
})


/** Action creator for TaskAddAction. */
const taskAddInfo = (infoItem: TaskInfoItem): TaskAddAction => ({
	type: ActionType.TaskAdd, 
	infoItem: infoItem
})


/** Action creator for TaskUpdateAction. */
const taskUpdateInfo = (infoItem: TaskInfoItem): TaskUpdateAction => ({
	type: ActionType.TaskUpdate, 
	infoItem: infoItem
}) 


/** Action creator for TaskDeleteAction. */
const taskDelete = (taskId: string): TaskDeleteAction => ({
	type: ActionType.TaskDelete, 
	taskId: taskId
})


/** Action creator for TaskSetFilterAction. */
const taskSetFilter = (filter: {key: keyof TaskInfoItem, type: 'category'|'string', values: string[]}): TaskSetFilterAction => ({
	type: ActionType.TaskSetFilter, 
	filter: filter
})


/** Action creator for TaskSelectIdsAction. */
const taskSelectIds = (ids: string[]) => ({
	type: ActionType.TaskSelectIds,
	ids: ids
})


/** Describes a thunk action which (for us) is an async function that promises to return T.
    We can dispatch thunk actions to the Redux store via the Thunk middleware. */
type ThunkAction<T> = (dispatch: Dispatch, getState?: () => RootState) => Promise<T>


/** Thunk action creator for initializing connection with server. */
const serverInitializeConnection = (clientId: string): ThunkAction<void> => (
	async (dispatch) => {
		let handleError = (errorText: string) => {
			dispatch(serverClearInfo(true))
			dispatch(serverAddLogItem({date: moment().toISOString(), type: 'Error', text: errorText}))
		}
		try{
			dispatch(serverClearInfo(true))
			dispatch(serverSetInfo({connectionStatus: 'Connecting'}))
			let communicator = Communicator.getInstance()
			communicator.setWsCloseHandler(() => handleError('Server connection was lost.'))
			communicator.clearMessageHandler(MessageServerLog)
			communicator.clearMessageHandler(MessageTaskInfoResponse)
			communicator.addMessageHandler(MessageServerLog, msg => {
				dispatch(serverAddLogItem(msg.payload))
			})
			communicator.addMessageHandler(MessageTaskInfoResponse, msg => {
				msg.payload.infoItems.forEach(info => dispatch(taskMergeInfo(info)))		
			})
			let tokenRequest = new MessageTokenRequest({clientId})
			let tokenResponse = await communicator.sendMessageAndWaitForResponse(tokenRequest, msg => {
				return (msg instanceof MessageTokenResponse)
			}) as MessageTokenResponse
			if (tokenResponse.payload.success) {   // If not success, server will send log message.
				let info = {
					connectionStatus: 'Connected' as ConnectionStatus, 
					connectionDate: moment().toISOString(), 
					clientId: clientId, 
					token: tokenResponse.payload.token
				}
				dispatch(serverSetInfo(info))
				dispatch(taskRequestOptions())
				dispatch(taskUpdateSubscription())
				dispatch(taskRequestSummaries())
			} else {
				dispatch(serverSetInfo({connectionStatus: 'Unconnected'}))
			}
		} catch (error) {
			handleError(`Server connection failed: ${(error as Error).message}`)
		}
	}
)


/** Thunk action creator for requesting possible task types and their input options. */
const taskRequestOptions = (): ThunkAction<void> => (
	async (dispatch, getState) => {
		try {
			let token = getState().server.token
			let communicator = Communicator.getInstance()
			let request = new MessageTaskCreateNew({token})
			let response = await communicator.sendMessageAndWaitForResponse(request, msg => {
				return msg instanceof MessageTaskTypeOptionsResponse
			}) as MessageTaskTypeOptionsResponse
			dispatch(taskSetTypeOptions(response.payload.taskOptions))
		} catch (error) {
			dispatch(serverAddLogItem({
				date: moment().toISOString(), 
				type: 'Error', 
				text: `Failed to request task type options: ${(error as Error).message}`
			}))
		}
	}
)


/** Thunk action creator for merging (add, update or delete) task info. */
const taskMergeInfo = (infoItem: TaskInfoItem): ThunkAction<void> => (
	async (dispatch, getState) => {
		let exists = getState().tasks.ids.some(id => id == infoItem.id)
		let pendingDelete = (infoItem.status == 'PendingDelete')
		if (!exists && !pendingDelete) {
			dispatch(taskAddInfo(infoItem))
		}
		if (exists && !pendingDelete) {
			dispatch(taskUpdateInfo(infoItem))
		} 
		if (exists && pendingDelete) {
			dispatch(taskDelete(infoItem.id))
		}
	}
)


/** Thunk action creator for submitting a task concept. Returns new taskId if successfully submitted. */
const taskSubmitConcept = (conceptTaskId: string): ThunkAction<{success: boolean, taskId: string}> => (
	async (dispatch, getState) => {
		const conceptInfo = getState().tasks.infoItemsById[conceptTaskId]
		let pendingInfo: TaskInfoItem = {...conceptInfo, status: 'PendingStart'}
		dispatch(taskMergeInfo(pendingInfo))
		try {
			let token = getState().server.token
			let communicator = Communicator.getInstance()
			let taskIds = getState().tasks.ids
			let request = new MessageTaskCreateNew({token: token, type: pendingInfo.type, input: pendingInfo.input})
			// Note: We assume first response from server with new task id corresponds to our new task. 
			// The edge case where this is not true probably won't occur in practice. 
			let response = await communicator.sendMessageAndWaitForResponse(request, msg => (   
				(msg instanceof MessageTaskInfoResponse) && 
				(taskIds.every(id => id != msg.payload.infoItems[0].id))
			)) as MessageTaskInfoResponse
			let newTaskInfo = response.payload.infoItems[0]
			newTaskInfo.input = pendingInfo.input 
			dispatch(taskMergeInfo(newTaskInfo))
			dispatch(taskDelete(pendingInfo.id))
			return {success: true, taskId: newTaskInfo.id}
		} catch (error) {
			dispatch(serverAddLogItem({
				date: moment().toISOString(), 
				type: 'Error', 
				text: `Failed to add task concept: ${(error as Error).message}`
			}))
			dispatch(taskMergeInfo(conceptInfo))
			return {success: false, taskId: conceptInfo.id}
		}
	}
)


/** Thunk action creator for getting summary of all tasks. */
const taskRequestSummaries = (): ThunkAction<void> => (
	async (dispatch, getState) => {
		let token = getState().server.token
		let communicator = Communicator.getInstance()
		let request = new MessageTaskInfoRequest()
		request.payload.token = token
		communicator.sendMessage(request)
	}
)


/** Thunk action creator for (un)subscribing to task detail updates. Defaults to summary updates for all tasks. */
const taskUpdateSubscription = (detailTaskId?: string): ThunkAction<void> => (
	async (dispatch, getState) => {
		let token = getState().server.token
		let communicator = Communicator.getInstance()
		let requestSubscription = new MessageTaskInfoSubscribe({
			token: token,
			defaultType: 'Summary', 
			overloads: []
		})
		if (!detailTaskId) {
			communicator.sendMessage(requestSubscription)
		} else {
			let taskLogs = getState().tasks.infoItemsById[detailTaskId].logs
			let requestDetails = new MessageTaskInfoRequest({
				token: token, 
				taskIds: [detailTaskId], 
				includeInput: true, 
				includeOutput: true, 
				includeLogs: true, 
				logStartDate: (taskLogs.length > 0) ? taskLogs[taskLogs.length - 1].date : ''
			})
			requestSubscription.payload.overloads = [{taskId: detailTaskId, type: 'Detail'}]
			communicator.sendMessage(requestSubscription)
			communicator.sendMessage(requestDetails)
		} 
	}
)


/** Thunk action creator for controlling a task, for example stop or delete. */
const taskControl = (taskId: string, action: 'stop'|'delete'): ThunkAction<void> => (
	async (dispatch, getState) => {
		let token = getState().server.token
		let communicator = Communicator.getInstance()
		let status = getState().tasks.infoItemsById[taskId].status
		if (status == 'PendingDelete' && action=='delete') {
			return
		} else if (status == 'Concept') {
			await dispatch(taskDelete(taskId))
			return
		} else {
			let request = new MessageTaskControl({token, taskId, action})
			let expectedStatus: TaskStatus = (action == 'stop') ? 'PendingStop' : 'PendingDelete'
			await communicator.sendMessageAndWaitForResponse(request, msg => (
				(msg instanceof MessageTaskInfoResponse) && 
				(msg.payload.infoItems[0].id == taskId) && 
				(msg.payload.infoItems[0].status == expectedStatus)
			))
			return
		}
	}
)


/** Action creators to be called from outside. */
export const actionCreators = {
	serverInitializeConnection, 
	serverClearInfo, 
	taskRequestSummaries,
	taskUpdateSubscription, 
	taskMergeInfo, 
	taskSubmitConcept, 
	taskDelete, 
	taskControl, 
	taskSetFilter, 
	taskSelectIds
}

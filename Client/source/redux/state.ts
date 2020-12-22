import * as moment from 'moment'
import { combineReducers } from 'redux'
import { RootAction, ActionType } from './actions'
import { LogItem, TaskType, TaskStatus, TaskTypeOptions, TaskInfoItem } from './../messaging/messages'


/** Possible server connection statuses. */
export type ConnectionStatus = 'Unconnected'|'Connecting'|'Connected'


/** State for server connection data. */
interface ServerState {
	connectionStatus: ConnectionStatus
	connectionDate: string 
	clientId: string
	token: string
	logs: LogItem[]
}


/** Initial values for ServerState. */
const serverStateInitial: ServerState = {
	connectionStatus: 'Unconnected', 
	connectionDate: '', 
	clientId: '',
	token: '',
	logs: []
}


/** State for tasks. */
interface TasksState {
	types: TaskType[]
	optionsByType: {[type: string]: TaskTypeOptions}
	ids: string[]
	infoItemsById: {[id: string]: TaskInfoItem}
	isSelectedById: {[id: string]: boolean}
	passesFiltersById: {[id: string]: boolean}
	filters: {key: keyof TaskInfoItem, type: 'category'|'string', values: string[]}[]
}


/** Initial values for TasksState. */
const tasksStateInitial: TasksState = {
	types: [],
	optionsByType: {},  
	ids: [], 
	infoItemsById: {}, 
	isSelectedById: {}, 
	passesFiltersById: {}, 
	filters: [
		{key: 'status', type: 'category', values: []},   // Values are categories to exclude.
		{key: 'description', type: 'string', values: []}   // Values are substrings to include.
	]
}


/** RootState is combination of all other states. */
export interface RootState {
	server: ServerState
	tasks: TasksState
}


/** Reducer for ServerState. */
const serverReducer = (state: ServerState = serverStateInitial, action: RootAction): ServerState => {
	switch (action.type) {
		case ActionType.ServerClearInfo:
		{
			return {...serverStateInitial, logs: action.clearLogs ? [] : state.logs}
		}
		case ActionType.ServerAddLogItem:
		{
			return {...state, logs: state.logs.concat(action.logItem)}
		}
		case ActionType.ServerSetInfo: 
		{
			let {type, ...info} = action
			return {...state, ...info}
		}
		default:
		{
			return state
		}
	}
}


/** Reducer for TasksState. */
const tasksReducer = (state: TasksState = tasksStateInitial, action: RootAction): TasksState => {
	
	// Helper method to remove null properties from plain object. 
	const removeNull = <T>(obj: T) => {
		let result = {} as Partial<T>
		for(let key in obj) {
			if (obj[key]) { result[key] = obj[key] }
		}
		return result
	}

	// Helper method to find out if given task info item passes all given filters.
	const passesFilters = (task: TaskInfoItem, filters: typeof state.filters) => {
		let passedByFilter = filters.map(f => {
			let taskValue = task[f.key].toString().toLowerCase()
			switch (f.type) {
				case 'category':   // Check task value is not an excluded category.
					return f.values.every(v => taskValue != v.toLowerCase())
				case 'string':   // Check task value matches all substrings.
					return f.values.every(v => taskValue.includes(v.toLowerCase()))
			}
		})
		return passedByFilter.every(v => v == true)
	}

	switch (action.type) {
		case ActionType.ServerClearInfo: {
			return tasksStateInitial
		}
		case ActionType.TaskSetTypeOptions: {
			let optionsByType = {} as {[type: string]: TaskTypeOptions}
			action.taskOptions.forEach(v => optionsByType[v.type] = v.options)
			return {
				...state, 
				types: action.taskOptions.map(v => v.type), 
				optionsByType: optionsByType
			}
		}
		case ActionType.TaskAdd: {
			let newInfo = action.infoItem
			if (!newInfo.logs) {newInfo.logs = []}
			return {
				...state, 
				ids: state.ids.concat(newInfo.id), 
				infoItemsById: {...state.infoItemsById, [newInfo.id]: newInfo}, 
				passesFiltersById: {...state.passesFiltersById, [newInfo.id]: passesFilters(newInfo, state.filters)}, 
				isSelectedById: {...state.isSelectedById, [newInfo.id]: false}
			}
		}
		case ActionType.TaskUpdate: {
			let oldInfo = state.infoItemsById[action.infoItem.id]
			let newInfo = removeNull(action.infoItem)
			newInfo.logs = newInfo.logs ? newInfo.logs : []
			if (oldInfo.logs.length > 0 && newInfo.logs.length > 0) {
				let lastLogDate	= oldInfo.logs[oldInfo.logs.length - 1].date
				let iOverlap = newInfo.logs.findIndex(log => log.date == lastLogDate)
				newInfo.logs = newInfo.logs.slice(iOverlap + 1)
			}
			let mergedInfo = {...oldInfo, ...newInfo, logs: oldInfo.logs.concat(newInfo.logs)}
			return {
				...state,
				infoItemsById: {...state.infoItemsById, [mergedInfo.id]: mergedInfo},
				passesFiltersById: {...state.passesFiltersById, [mergedInfo.id]: passesFilters(mergedInfo, state.filters)}
			}
		}
		case ActionType.TaskDelete: {
			let {[action.taskId]: infoItemRemoved, ...infoItemsById} = state.infoItemsById
			let {[action.taskId]: isSelectedRemoved, ...isSelectedById} = state.isSelectedById
			let {[action.taskId]: isFilteredRemoved, ...passesFiltersById} = state.passesFiltersById
			return {
				...state, 
				ids: state.ids.filter(id => id != action.taskId),
				infoItemsById: infoItemsById,
				isSelectedById: isSelectedById, 
				passesFiltersById: passesFiltersById
			}
		}
		case ActionType.TaskSetFilter: {
			let filters = state.filters.map(f => f.key != action.filter.key ? f : action.filter)
			let passesFiltersById = {...state.passesFiltersById}
			state.ids.forEach(id => passesFiltersById[id] = passesFilters(state.infoItemsById[id], filters))
			let isSelectedById = {...state.isSelectedById}
			state.ids.forEach(id => isSelectedById[id] = passesFiltersById[id] ? isSelectedById[id]: false)
			return {
				...state,
				filters: filters, 
				passesFiltersById: passesFiltersById,
				isSelectedById: isSelectedById
			}
		}
		case ActionType.TaskSelectIds: {
			let isSelectedById = {...state.isSelectedById}
			state.ids.forEach(id => isSelectedById[id] = false)
			action.ids.forEach(id => isSelectedById[id] = true)
			return {
				...state,
				isSelectedById: isSelectedById
			}
		}
		default: {
			return state
		}
	}
}


/** Reducer for RootState by combining all other reducers. */
export const rootReducer = combineReducers<RootState>({
	server: serverReducer, 
	tasks: tasksReducer
})

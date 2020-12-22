import { createStore, applyMiddleware, compose, Action } from 'redux'
import thunk from 'redux-thunk'
import { ThunkMiddleware } from 'redux-thunk' 
import { RootState, rootReducer } from './state'


// Apply thunk middleware and override compose if redux devtools is installed.
const w = window as any
const thunkMiddleware = thunk as ThunkMiddleware<RootState>
const composeEnhancers = (w.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose) as typeof compose
const enhancer = composeEnhancers(applyMiddleware(thunkMiddleware))

/** Redux store enhanced with thunk middleware and support for devtools extension. */
export const store = createStore(rootReducer, enhancer)

/** Proper type of dispatch, this accepts Action or ThunkAction. */
export type Dispatch = typeof store.dispatch


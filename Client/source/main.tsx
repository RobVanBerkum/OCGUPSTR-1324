import 'core-js'   // Polyfill for IE support.
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { NavigationContainer } from './components/navigation'
import { NotifierContainer } from './components/notifier'
import { PageLogin } from './components/page-login'
import { PageTasks } from './components/page-tasks'
import { actionCreators } from './redux/actions'


/** Main app. */
const App = () => (
	<Provider store={store}>
		<HashRouter>
			<div>
				<NavigationContainer/>
				<NotifierContainer/>
				<Switch>
					<Route exact path='/' component={PageLogin}/>
					<Route path='/login' component={PageLogin}/>
					<Route path='/tasks/:taskId/:detailTabId' component={PageTasks}/>
					<Route path='/tasks/:taskId' component={PageTasks}/>
					<Route path='/tasks' component={PageTasks}/>
				</Switch>
			</div>
		</HashRouter>
	</Provider> 
)


/** Automatically login as User. In the future, we probably want to (re)store info using cookies. */
store.dispatch(actionCreators.serverInitializeConnection('User'))


/** Render app in React entrypoint. */
ReactDOM.render(
    <App />,
    document.getElementById("react-root")
);

import * as React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux';
import { RouteComponentProps, withRouter } from 'react-router-dom'
import { RootState } from './../redux/state'
import { TaskStatus } from './../messaging/messages'


/** Props for notifier component. */
interface NotifierProps extends RouteComponentProps<{}> {
	tasks: {id: string, status: TaskStatus}[]
}


/** Notify user of task status changes. Currently does not work on IE. */
class Notifier extends React.Component<NotifierProps, {}> {

	/** Notify user via browser notification api, 
	    see https://developer.mozilla.org/nl/docs/Web/API/notification. */
	private notify = (title: string, msg: string, id: string, onClick: () => void) => {
		if (!window.hasOwnProperty('Notification')) { return }   // Nothing to do here.
		Notification.requestPermission(permission => {
			if (permission == 'granted') {
				let notification = new Notification(title, {body: msg, tag: id})
				notification.onclick = () => {
					onClick()
					notification.close()
				}
				new Promise(resolve => setTimeout(resolve, 5000)).then(() => notification.close())
			}
		})
	}


	/** Notify user if necessary. */
	componentWillReceiveProps(nextProps: NotifierProps) {		
		nextProps.tasks.forEach(tNext => {
			let tCurrent = this.props.tasks.find(t => t.id == tNext.id)
			let doNotify = tCurrent && 
				tCurrent.status != tNext.status && 
				(tNext.status == 'Running' || tNext.status == 'Success' || tNext.status == 'Error')
			if (doNotify) {
				this.notify(
					`Genserver: Task ${tNext.status}`,
					'Click to view details',
					tNext.id, 
					() => {
						this.props.history.push(`/tasks/${tNext.id}/logging`)
						window.focus()
					} 
				)
			}
		})
	}

	/** This component doesn't render any HTML. */
	render() {
		return null as JSX.Element
	}
}


/** Map Redux state to component props. */
const mapStateToNotifierProps = (state: RootState, ownProps: RouteComponentProps<{}>): NotifierProps => {
	let tasks = state.tasks.ids
		.map(id => state.tasks.infoItemsById[id])
		.map(t => ({id: t.id, status: t.status}))
	return {...ownProps, tasks: tasks}
}


/** Export connected component. */
export const NotifierContainer = withRouter(connect(mapStateToNotifierProps)(Notifier))

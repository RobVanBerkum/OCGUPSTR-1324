import * as React from 'react'
import * as moment from 'moment'
import { Grid, Message } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux';
import { RootState, ConnectionStatus } from './../redux/state'
import { LogItem } from './../messaging/messages'


/** Describes component props. */
interface ServerLogProps {
	logs: LogItem[]
}


/** React component that shows server log items, for example connection lost. */
const ServerLog = (props: ServerLogProps) => {
	const infos = props.logs
		.filter(item => item.type == 'Info')
		.map(item => `[${moment.utc(item.date).local().format('D-MMM-YYYY HH:mm:ss')}] ${item.text}`)
	const warnings = props.logs
		.filter(item => item.type == 'Warning')
		.map(item => `[${moment.utc(item.date).local().format('D-MMM-YYYY HH:mm:ss')}] ${item.text}`)
	const errors = props.logs
		.filter(item => item.type == 'Error')
		.map(item => `[${moment.utc(item.date).local().format('D-MMM-YYYY HH:mm:ss')}] ${item.text}`)
	const msgInfos = infos.length == 0 ? null : 
		<Message info header='Server info' icon='info circle' list={infos}/>
	const msgWarnings = warnings.length == 0 ? null : 
		<Message warning header='Server warning' icon='warning sign' list={warnings}/>
	const msgErrors = errors.length == 0 ? null : 
		<Message negative header='Server error' content='If the error persists, try disconnecting and logging in again.' icon='warning sign' list={errors}/>
	return (props.logs.length == 0 ? null : 
		<Grid.Row>
			<Grid.Column>
				{msgErrors}
				{msgWarnings}
				{msgInfos}
			</Grid.Column>
		</Grid.Row>
	)
}


/** Map Redux state to component properties. */
const mapStateToServerLogProps = (state: RootState): Partial<ServerLogProps> => ({
	logs: state.server.logs
})


/** Container component connected to Redux. */
export const ServerLogContainer = connect(mapStateToServerLogProps)(ServerLog)

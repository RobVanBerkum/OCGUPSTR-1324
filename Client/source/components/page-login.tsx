import * as React from 'react'
import * as moment from 'moment'
import { Grid, Header, Message, Segment, Form, Button } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { Dispatch } from './../redux/store'
import { RootState, ConnectionStatus } from './../redux/state'
import { actionCreators } from './../redux/actions'
import { ServerLogContainer } from './server-log'
import { Communicator } from './../messaging/communicator'


/** React props for Login component. */
interface ILoginProps {
	onConnect: (data: ILoginState) => void
	onDisconnect: () => void
	connectionStatus: ConnectionStatus
	connectionDate: moment.Moment
	clientId: string
	token: string
}


/** React state for LoginInfo component. */
interface ILoginState {
	formClientId: string
	formErrors: string[]
}


/** React component for connecting to server and showing login info. */
class Login extends React.Component<ILoginProps, ILoginState> {

	/** Default constructor */
	constructor(props: ILoginProps) {
		super(props)
		this.state = {
			formClientId: '', 
			formErrors: []
		}
	}

	/** Validate user input and update formError in state. Returns true if input is valid. */
	private validateInput = () => {
		let errors = []
		if (this.state.formClientId == '') {
			errors.push('ClientId cannot be empty.')
		}
		this.setState({formErrors: errors})
		return (errors.length == 0)
	} 

	/** Handle connect action. */
	private handleConnect = () => {
		if (this.validateInput()) {
			this.props.onConnect(this.state)
		}
	}

	/** Handle unconnect action. */
	private handleDisconnect = () => {
		this.props.onDisconnect()
	}

	/** Render the component. */
	render() {
		const header = 
			<Header 
				size='huge' 
				attached='top'
				content={this.props.connectionStatus != 'Connected' ? 'Login': 'Connection Info'}
				subheader={this.props.connectionStatus != 'Connected' ? 'Provide your credentials and connect to Genserver.' : null}
			/>
		const errors = this.state.formErrors.length == 0 ? null : 
			<Message size='small' negative content={this.state.formErrors}/>
		const contentConnected = 
			<Message attached info>
				<p>Connected as {this.props.clientId}, since {this.props.connectionDate.format('D-MMM-YYYY HH:mm:ss')}.</p>
			</Message>
		const contentUnconnected = 
			<Segment attached loading={this.props.connectionStatus == 'Connecting'}>
				<Form.Field>
					<label>ClientId</label>
					<Form.Input 
						placeholder={'Enter your clientId'}
						value={this.state.formClientId}
						onChange={(event, props) => {this.setState({formClientId: props.value})}}
					/>
				</Form.Field>
				{errors}
			</Segment>
		const content = this.props.connectionStatus == 'Connected' ? contentConnected : contentUnconnected 
		const button = this.props.connectionStatus == 'Connected' ? 
			<Button primary content={'Disconnect'} onClick={this.handleDisconnect} /> : 
			<Button primary content={'Connect'} onClick={this.handleConnect} disabled={this.props.connectionStatus == 'Connecting'} /> 
		const footer = 
			<Segment attached='bottom'>
				{button}
			</Segment>	
		const row =
			<Grid.Row centered id='row-login'> 
			<Grid.Column width={8}>
				<Segment.Group>
					<Form>
						{header}
						{content}
						{footer}
					</Form>
				</Segment.Group>
			</Grid.Column>
			</Grid.Row>
		return row
	}
}


/** Map Redux state to component props. */
const mapStateToLoginProps = (state: RootState): Partial<ILoginProps> => ({
	connectionStatus: state.server.connectionStatus,
	connectionDate: moment.utc(state.server.connectionDate).local(),
	clientId: state.server.clientId,
	token: state.server.token
})


/** Map Redux dispatch to component props. */
const mapDispatchToLoginProps = (dispatch: Dispatch): Partial<ILoginProps> => ({
	onConnect: (data) => {
		dispatch(actionCreators.serverInitializeConnection(data.formClientId))
	},
	onDisconnect: () => {
		dispatch(actionCreators.serverClearInfo(true))
		Communicator.getInstance().closeWs()
	}
})


/** Container component connected to Redux. */
const LoginContainer = connect(mapStateToLoginProps, mapDispatchToLoginProps)(Login)


/** Component for page login. */
export const PageLogin = () => (
	<Grid stackable padded>
		<ServerLogContainer/>
		<LoginContainer/>
	</Grid>
)

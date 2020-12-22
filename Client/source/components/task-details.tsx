import * as React from 'react'
import * as moment from 'moment'
import { connect } from 'react-redux'
import { Dispatch } from './../redux/store'
import { Link, RouteComponentProps, withRouter } from 'react-router-dom'
import { 
	Grid, Header, Tab, Menu, Checkbox, Icon, Segment, Form, 
	Message, Breadcrumb, Card, Button, Popup, Dropdown, Confirm 
} from 'semantic-ui-react'
import { TaskType, TaskTypeOptions, TaskInfoItem, TaskInput } from './../messaging/messages'
import { actionCreators } from './../redux/actions'
import { RootState } from './../redux/state'
import { inputClassesByTaskType, inputValidatorsByTaskType, outputClassesByTaskType } from './task-io'
import { taskStatusToIcon } from './task-browser'


/** Describes detail tab ids. */
type DetailTabId = 'input'|'logging'|'output'


/** Describes props for task details component. */
interface TaskDetailsProps {
	clientId: string
	taskId: string
	detailTabId: DetailTabId
	taskInfo: TaskInfoItem
	taskTypeOptions: TaskTypeOptions
	onSaveTaskConcept: (conceptTaskInfo: TaskInfoItem) => void 
	onSubmitTaskConcept: (conceptTaskId: string) => Promise<void>
	onRejectTaskConcept: (conceptTaskId: string) => Promise<void>
	onUpdateSubscription: (detailTaskId?: string) => void 
	onDuplicateTask: (duplicateTaskInfo: TaskInfoItem) => void
	onStopTask: (taskId: string) => void
	onDeleteTask: (taskId: string) => void
}


/** Describes state for task details component. 
	conceptTaskInput holds intermediate state of the task input form so we don't 
	have to update Redux state on every change of input values. */
interface TaskDetailsState {
	followLog: boolean
	conceptTaskInput: TaskInput
	conceptErrors: string[]
	isOpenConfirmDelete: boolean
}


/** Component for showing details of selected task. */
class TaskDetails extends React.Component<TaskDetailsProps, TaskDetailsState> {
	private scrollHandlerDisposer = () => {}
	private taskDescriptionByType: {[key in TaskType]: string} = {
		Genperl: 'Start a Gensimul run using Genperl script.', 
		FolderWatch: 'Watch a folder and start new tasks on Genserver when files are detected.'
	}

	/** Enable or disable follow log on scroll. */
	private updateFollowLog = (enabled: boolean) => {
		let prevScrollY = 0
		const scrollHandler = () => {
			let scrollY = window.scrollY
			if (scrollY < prevScrollY) {   // Scroll up event.
				this.updateFollowLog(false)
			} else {	// Scroll down event.
				prevScrollY = scrollY
			}
		}
		if (!this.state.followLog && enabled) {   // Enable follow scroll.
			window.addEventListener('scroll', scrollHandler)
			this.scrollHandlerDisposer = () => window.removeEventListener('scroll', scrollHandler)
			this.setState({followLog: true})
		}
		if (this.state.followLog && !enabled) {   // Disable follow scroll.
			this.scrollHandlerDisposer()
			this.setState({followLog: false})
		}
	}

	/** Handle share via clipbloard. */
	private handleShareViaClipboard = () => {
		const url = `${window.location.origin}/#/tasks/${this.props.taskId}`
		const onCopy = (ev: ClipboardEvent) => {
			ev.clipboardData.setData('text/plain', url)
			ev.preventDefault()
			document.removeEventListener('copy', onCopy)
		}
		document.addEventListener('copy', onCopy)
		document.execCommand('copy')
	}

	/** Handle share via mail. */
	private handleShareViaMail = () => {
		let urlTask = `${window.location.origin}/#/tasks/${this.props.taskId}`
		let subject = encodeURIComponent(`Sharing Genserver task`)
		let body = encodeURIComponent(
			`Hey,\n\nHave a look at this Genserver task:\n${urlTask}\n\nKind regards,\n<your name>`
		)
		let urlMail = `mailto:?subject=${subject}&body=${body}`
		document.location.href = urlMail
	}

	/** Handle save concept. */
	private handleSaveConcept = () => {
		let conceptInfo = {
			...this.props.taskInfo, 
			input: this.state.conceptTaskInput, 
			description: this.state.conceptTaskInput.description

		}
		this.props.onSaveTaskConcept(conceptInfo)
	}

	/** Handle submit concept. */
	private handleSubmitConcept = () => {
		let {success, errors} = inputValidatorsByTaskType[this.props.taskInfo.type](this.state.conceptTaskInput)
		if (success) {
			this.handleSaveConcept()
			this.setState({conceptTaskInput: null, conceptErrors: []}, () => {
				this.props.onSubmitTaskConcept(this.props.taskInfo.id)
			})
		} else {
			this.setState({conceptErrors: errors})
		}
	}

	/** Handle reject concept. */
	private handleRejectConcept = () => {
		this.setState({conceptTaskInput: null}, () => {
			this.props.onRejectTaskConcept(this.props.taskInfo.id)
		})
	}

	/** Handle duplicate task. */
	private handleDuplicateTask = () => {
		let sourceInput = this.props.taskInfo.input
		let duplicateInfo: TaskInfoItem = {
			id: 'CONCEPT',
			type: this.props.taskInfo.type,
			status: 'Concept',
			description: `Duplicate of ${sourceInput.description}`,
			ownerClientId: this.props.clientId, 
			dateCreated: moment().toISOString(),
			input: {...sourceInput, description: `Duplicate of ${sourceInput.description}`}, 	
			logs: [], 
			output: null
		}
		this.props.onDuplicateTask(duplicateInfo)
	}

	/** Handle stop task. */
	private handleStopTask = () => {
		this.props.onStopTask(this.props.taskId)
	}

	/** Handle delete task. */
	private handleConfirmDeleteTask = () => {
		this.setState({isOpenConfirmDelete: true})
	}

	/** Render breadcrumb. */
	private renderBreadcrumb = () => {
		const breadcrumb = 
			<Breadcrumb size='huge'>
				<Breadcrumb.Section link content='Task Browser' as={Link} to='/tasks'/>
				<Breadcrumb.Divider icon='right chevron'/>
				<Breadcrumb.Section active content={this.props.taskId}/>
			</Breadcrumb>
		return breadcrumb
	}

	/** Render task summary. */
	private renderSummary = () => {
		let status = this.props.taskInfo.status
		let isConcept = status == 'Concept'
		let isStoppable = status == 'PendingStart' || status == 'Running'
		const menu = 
			<Menu secondary pointing>
				<Menu.Item header content='Summary'/>
			</Menu>
		const dropdownControl =
			<Dropdown
				trigger={<Button basic labelPosition='left' icon='content' content='Control'/>}
				disabled={isConcept}
				icon={null}
				pointing='top left'
				selectOnBlur={false}
			>
				<Dropdown.Menu>
					<Dropdown.Item content='Duplicate task' disabled={isConcept} icon='clone' onClick={this.handleDuplicateTask}/>
					<Dropdown.Item content='Stop task' disabled={!isStoppable} icon='stop' onClick={this.handleStopTask}/>
					<Dropdown.Item content='Delete task' icon='trash' onClick={this.handleConfirmDeleteTask}/>
				</Dropdown.Menu>
			</Dropdown>
		const buttonShareClipboard = 
			<Popup
				trigger={<Button circular basic icon='linkify' disabled={isConcept} onClick={this.handleShareViaClipboard}/>}
				content='Share task link by copying to clipboard.'
				position='bottom left'
				inverted
				size='small'
				closeOnTriggerClick
				mouseEnterDelay={500}
			/>
		const buttonShareMail = 
			<Popup
				trigger={<Button circular basic icon='mail' disabled={isConcept} onClick={this.handleShareViaMail}/>}
				content='Share task link via email.'
				position='bottom left'
				inverted
				size='small'
				closeOnTriggerClick
				mouseEnterDelay={500}
			/>
		const menuSub = 
			<Menu secondary>
				<Menu.Item fitted>
					{dropdownControl}
				</Menu.Item>
			</Menu>
		const card = 
			<Card fluid>
				<Card.Content>
					<Header 
						icon={taskStatusToIcon(this.props.taskInfo.status)} 
						content={this.props.taskInfo.type} 
						subheader={this.props.taskInfo.status}
					/>
				</Card.Content>
				<Card.Content content={this.taskDescriptionByType[this.props.taskInfo.type]}/>
				<Card.Content extra>
					<Menu secondary borderless>
						<Menu.Item fitted header content='Share'/>
						<Menu.Item fitted>
							<div>
								{buttonShareClipboard}
								{buttonShareMail}
							</div>
						</Menu.Item>
					</Menu>
				</Card.Content>
			</Card>
		return <div>
			{menu}
			{menuSub}
			{card}
		</div>
	}

	/** Render input/logging/output menu. */
	private renderMenu = () => {
		const taskId = this.props.taskId
		const itemInput = 
			<Menu.Item name='Input' active={this.props.detailTabId=='input'} as={Link} to={`/tasks/${taskId}/input`}/>
		const itemLogging = this.props.taskInfo.status == 'Concept' ? 
			<Menu.Item name='Logging' disabled/> :
			<Menu.Item name='Logging' active={this.props.detailTabId=='logging'} as={Link} to={`/tasks/${taskId}/logging`}/>
		const itemOutput = this.props.taskInfo.status == 'Concept' ? 
			<Menu.Item name='Output' disabled/> : 
			<Menu.Item name='Output' active={this.props.detailTabId=='output'} as={Link} to={`/tasks/${taskId}/output`}/>
		const menu = 
			<Menu pointing secondary>
				<Menu.Item header content='Details'/>
				{itemInput}
				{itemLogging}
				{itemOutput}
				{this.renderConfirmDelete()}
			</Menu>
		return menu
	}

	/** Render menu for input tab. */
	private renderInputTabMenu = () => {
		const taskInfo = this.props.taskInfo
		const itemsConcept = 
			<Menu.Item fitted>
				<div>
					<Button color='blue' icon='play' content='Start' onClick={this.handleSubmitConcept}/>
					<Button icon='remove' content='Cancel' onClick={this.handleRejectConcept}/>
				</div>
			</Menu.Item>
		const menu = 
			<Menu secondary size='small'>
				{taskInfo.status == 'Concept' ? itemsConcept : null}
			</Menu>
		return taskInfo.status == 'Concept' ? menu : null
	}

	/** Render logging tab menu. */
	private renderLoggingTabMenu = () => {
		const iconTail = this.state.followLog ? 
			<Icon name='toggle on' color='blue'/> : <Icon name='toggle off'/>
		const buttonTail = 
			<Button 
				basic 
				icon={iconTail} 
				content='Tail' 
				onClick={() => this.updateFollowLog(!this.state.followLog)}
			/>
		const popupTail = 
			<Popup
				trigger={buttonTail}
				content='Enable to tail latest log items.'
				position='bottom center'
				inverted
				size='small'
				openOnTriggerClick={false}
				mouseEnterDelay={500}
			/>
		const menu = 
			<Menu secondary>
				<Menu.Item fitted>
					{popupTail}
				</Menu.Item>
			</Menu>
		return menu
	}

	/** Render output tab menu. */
	private renderOutputTabMenu = () => {
		return null as JSX.Element
	}

	/** Render menu for active detail tab, defaults to input tab. */
	private renderActiveTabMenu = () => {
		switch (this.props.detailTabId) {
			case 'output':
				return this.renderOutputTabMenu()
			case 'logging': 
				return this.renderLoggingTabMenu()
			default:
				return this.renderInputTabMenu()
		}
	}

	/** Render content for input tab. */
	private renderInputTabContent = () => {
		const InputClass = inputClassesByTaskType[this.props.taskInfo.type]   // JSX requires capital first letter.
		const input = this.state.conceptTaskInput ? this.state.conceptTaskInput : this.props.taskInfo.input
		const form = 
			<InputClass 
				input={input}
				options={this.props.taskTypeOptions}
				readOnly={(this.state.conceptTaskInput == null)} 
				onChange={partialInput => this.setState({
					conceptTaskInput: {...this.state.conceptTaskInput, ...partialInput}
				})}
			/>
		const messageErrors = this.state.conceptErrors.length == 0 ? null : 
			<Message 
				error
				header='Failed to submit concept, please resolve these errors and try again.'
				list={this.state.conceptErrors}
				onDismiss={() => this.setState({conceptErrors: []})}
				size='small'
			/>
		const segment = 
			<Segment>
				{form}
			</Segment>
		return <div>
			{messageErrors}
			{segment}
		</div>
	}

	/** Render logging tab content. */
	private renderLoggingTabContent = () => {
		const placeholder = <code>No log messages found.</code>
		const logItems = this.props.taskInfo.logs.map((logItem, i) => {
			let timestamp = moment.utc(logItem.date).local().format('DD-MMM-YYYY HH:mm:ss')
			let type = logItem.type == 'Info' ? '' : `${logItem.type}: `
			return <code key={i}>{`[${timestamp}] ${type}${logItem.text}`}</code>
		})
		const segment = 
			<Segment> 
				{logItems.length == 0 ? placeholder : logItems}
			</Segment>
		return segment
	}

	/** Render output tab content. */
	private renderOutputTabContent = () => {
		const OutputClass = outputClassesByTaskType[this.props.taskInfo.type]   // JSX requires capital first letter.
		const output = this.props.taskInfo.output
		const form = <OutputClass output={output}/>
		const segment = <Segment>{form}</Segment>
		return segment
	}

	/** Render content for active detail tab, defaults to input tab. */
	private renderActiveTabContent = () => {
		switch (this.props.detailTabId) {
			case 'output':
				return this.renderOutputTabContent()
			case 'logging': 
				return this.renderLoggingTabContent()
			default:
				return this.renderInputTabContent()
		}
	}

	/** Render confirm delete dialog. */
	private renderConfirmDelete = () => {
		const confirm = 
			<Confirm 
				header='Confirm'
				content='Deleting this task cannot be undone. Are you sure?'
				confirmButton='Yes'
				cancelButton='No'
				open={this.state.isOpenConfirmDelete}
				onCancel={() => this.setState({isOpenConfirmDelete: false})}
				onConfirm={() => {
					this.setState({isOpenConfirmDelete: false})
					this.props.onDeleteTask(this.props.taskId)
				}}
			/>
		return confirm
	}

	/** Default constructor. */
	constructor(props: TaskDetailsProps) {
		super(props)
		let isConcept = (props.taskInfo && props.taskInfo.status == 'Concept')
		this.state = {
			followLog: false, 
			conceptTaskInput: isConcept ? props.taskInfo.input : null, 
			conceptErrors: [], 
			isOpenConfirmDelete: false
		}
		if (this.props.taskInfo && !isConcept) {
			this.props.onUpdateSubscription(this.props.taskInfo.id)
		}
	}

	/** Update state and subscription on receiving new task info. */
	componentWillReceiveProps(nextProps: TaskDetailsProps) {
		let oldInfo = this.props.taskInfo
		let newInfo = nextProps.taskInfo
		let newIsConcept = (newInfo && newInfo.status == 'Concept')

		if (oldInfo && newInfo && oldInfo.id == newInfo.id) { return }   // Nothing to do here.

		if (newInfo && !newIsConcept) {   // Update subscription for new task id.
			this.props.onUpdateSubscription(newInfo.id)
		}

		if (this.state.conceptTaskInput) {   // Save concept info.
			this.handleSaveConcept()
		}

		this.setState({conceptTaskInput: newIsConcept ? newInfo.input : null, conceptErrors: []})
	}

	/** Render this component. */
	render() {
		const header = 
			<Header size='huge'>	
				<Header.Content>
					{this.renderBreadcrumb()}
					<Header.Subheader content='View or edit task details.'/>
				</Header.Content>
			</Header>
		const messageNotFound = this.props.taskInfo ? null : 
			<Message warning icon>
				<Icon name='warning circle'/>
				<Message.Content>
					<Message.Header content='Not found'/>
					Task {this.props.taskId} does not exist, or cannot be viewed by current client. 
					Use <Link to='/tasks'>task browser</Link> to view available tasks.
				</Message.Content>
			</Message>			
		const summary = !this.props.taskInfo ? null : this.renderSummary()
		const tabs = !this.props.taskInfo ? null : 
			<div>
				{this.renderMenu()}
				{this.renderActiveTabMenu()}
				{this.renderActiveTabContent()}
			</div>
		const rowHeader = 
			<Grid.Row key='row-header'>
				<Grid.Column width={16}>
					{header}
					{messageNotFound}
				</Grid.Column>
			</Grid.Row>
		const rowContent = 
			<Grid.Row key='row-content'>
				<Grid.Column width={4}>
					{summary}
				</Grid.Column>
				<Grid.Column width={12}>
					{tabs}
				</Grid.Column>
			</Grid.Row>
		return [rowHeader, rowContent]
	}

	/** Scroll to bottom after component update. */
	componentDidUpdate() {
		if (this.state.followLog) {
			window.scrollTo({top: document.body.scrollHeight, behavior: 'instant'})
		}
	}

	/** Do some cleanup when component unmounts. */
	componentWillUnmount() {
		this.scrollHandlerDisposer()
		if (this.state.conceptTaskInput) {
			this.handleSaveConcept()
		}
		if (this.props.taskInfo && this.props.taskInfo.status != 'Concept') {
			this.props.onUpdateSubscription()
		}
	}
}


/** Props for task details container component. */
interface TaskDetailsContainerProps extends RouteComponentProps<{}> {
	taskId: string
	detailTabId?: string
}


/** Map Redux state to component props. */
const mapStateToTaskDetailsProps = (state: RootState, ownProps: TaskDetailsContainerProps): Partial<TaskDetailsProps> => {
	let taskExists = state.tasks.ids.some(id => id == ownProps.taskId)
	let taskInfo = taskExists ? state.tasks.infoItemsById[ownProps.taskId] : null
	let taskTypeOptions = taskExists ? state.tasks.optionsByType[taskInfo.type] : null
	return {
		clientId: state.server.clientId, 
		taskId: ownProps.taskId, 
		detailTabId: ownProps.detailTabId ? (ownProps.detailTabId as DetailTabId) : 'input', 
		taskInfo : taskInfo, 
		taskTypeOptions: taskTypeOptions
	}
}


/** Map Redux dispatch to component props. */
const mapDispatchToTaskDetailsProps = (dispatch: Dispatch, ownProps: TaskDetailsContainerProps): Partial<TaskDetailsProps> => ({
	onSaveTaskConcept: (conceptTaskInfo) => dispatch(actionCreators.taskMergeInfo(conceptTaskInfo)), 
	onSubmitTaskConcept: async conceptTaskId => {
		let {success, taskId} = await dispatch(actionCreators.taskSubmitConcept(conceptTaskId))
		ownProps.history.push(success ? `/tasks/${taskId}/logging` : '/tasks')
	}, 
	onRejectTaskConcept: async conceptTaskId => {
		await dispatch(actionCreators.taskDelete(conceptTaskId))
		ownProps.history.push('/tasks')
	},
	onUpdateSubscription: (detailTaskId?) => dispatch(actionCreators.taskUpdateSubscription(detailTaskId)), 
	onDuplicateTask: (duplicateTaskInfo) => {
		dispatch(actionCreators.taskMergeInfo(duplicateTaskInfo))
		ownProps.history.push(`/tasks/${duplicateTaskInfo.id}`)
	},
	onStopTask: taskId => dispatch(actionCreators.taskControl(taskId, 'stop')),
	onDeleteTask: async taskId => {
		await dispatch(actionCreators.taskControl(taskId, 'delete'))
		ownProps.history.push('/tasks')
	}
})


/** Export component. */
export const TaskDetailsContainer = withRouter(connect(mapStateToTaskDetailsProps, mapDispatchToTaskDetailsProps)(TaskDetails))

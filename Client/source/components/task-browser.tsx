import * as React from 'react'
import * as moment from 'moment'
import { connect } from 'react-redux'
import { Dispatch } from './../redux/store'
import { Link, RouteComponentProps, withRouter } from 'react-router-dom'
import { 
	Grid, Segment, Menu, Dropdown, Header, Table, Icon, Input, 
	Message, Breadcrumb, Button, Popup, Confirm
} from 'semantic-ui-react'
import { TaskType, TaskInfoItem, TaskStatus } from './../messaging/messages'
import { RootState } from './../redux/state'
import { actionCreators } from './../redux/actions'
import { inputDefaultsByTaskType } from './task-io'


/** Get icon corresponding to task status. */
export const taskStatusToIcon = (status: TaskStatus) => {
	switch (status) {
		case 'Concept': return <Icon name='pencil' color='blue'/>
		case 'PendingStart': return <Icon name='hourglass start' color='grey'/>
		case 'Running': return <Icon name='hourglass half' color='yellow' className='flip'/>
		case 'PendingStop': return <Icon name='hourglass end' color='yellow'/>
		case 'Success': return <Icon name='check' color='green' />
		case 'Error': return <Icon name='remove' color='red'/>
	}
}


/** Props for task browser component. */
interface TaskBrowserProps {
	clientId: string
	taskTypes: TaskType[]
	tasks: TaskInfoItem[]
	passesFiltersById: {[id: string]: boolean}
	isSelectedById: {[id: string]: boolean}
	filters: {key: keyof TaskInfoItem, type: 'category'|'string', values: string[]}[]
	onAddTaskConcept: (conceptInfo: TaskInfoItem) => void
	onSetFilter: (filter: {key: keyof TaskInfoItem, type: 'category'|'string', values: string[]}) => void
	onSelectTasks: (ids: string[]) => void
	onDeleteTasks: (ids: string[]) => void
	onViewTaskDetails: (id: string) => void
}


/** State for task browser component. */
interface TaskBrowserState {
	isOpenConfirmDelete: boolean
	isOpenFilterDropdown: boolean
}

/** Component for browsing all tasks. */
class TaskBrowser extends React.Component<TaskBrowserProps, TaskBrowserState> {

	/** Handle click on filter status event. */
	private handleStatusFilterClick = (event: React.MouseEvent<HTMLElement>, value: TaskStatus) => {
		let excludeValues = this.props.filters.find(f => f.key == 'status').values
		let newExcludeValues = excludeValues.some(v => v == value) ? 
			excludeValues.filter(v => v != value) : 
			excludeValues.concat(value)
		this.props.onSetFilter({key: 'status', type: 'category', values: newExcludeValues})
	}

	/** Handle change event of description filter. */
	private handleDescriptionFilterChange = (event: React.SyntheticEvent<HTMLElement>, value: string) => {
		this.props.onSetFilter({key: 'description', type: 'string', values: [value]})
	}

	/** Handle clear filters click event. */
	private handleFiltersClearClick = () => {
		this.props.filters.forEach(f => this.props.onSetFilter({key: f.key, type: f.type, values: []}))
	}

	/** Handle click on add task button. */
	private handleAddTaskClick = (taskType: TaskType) => {
		let conceptInfo: TaskInfoItem = {
			id: 'CONCEPT',
			type: taskType,
			status: 'Concept',
			description: '',
			ownerClientId: this.props.clientId, 
			dateCreated: moment().toISOString(),
			input: inputDefaultsByTaskType[taskType], 
			logs: [], 
			output: null
		}
		this.props.onAddTaskConcept(conceptInfo)
	}

	/** Handle click on select all button. */
	private handleSelectAllClick = () => {
		let idsSelected = this.props.tasks.filter(t => this.props.passesFiltersById[t.id]).map(t => t.id)
		this.props.onSelectTasks(idsSelected)
	}

	/** Handle click on select none button. */
	private handleSelectNoneClick = () => {
		this.props.onSelectTasks([])
	}

	/** Handle click on select inverse button. */
	private handleSelectInverseClick = () => {
		let isSelectedById = this.props.isSelectedById
		let passesFiltersById = this.props.passesFiltersById
		let idsSelected = this.props.tasks
			.filter(t => !isSelectedById[t.id] && passesFiltersById[t.id]) 
			.map(t => t.id)
		this.props.onSelectTasks(idsSelected)
	}

	/** Handle view details click. */
	private handleViewDetailsClick = () => {
		let id = this.props.tasks.find(t => this.props.isSelectedById[t.id]).id
		this.props.onViewTaskDetails(id)
	}

	/** Handle delete click. */
	private handleDeleteClick = () => {
		this.setState({isOpenConfirmDelete: true})
	}

	/** Handle click on some task table row. */
	private handleTableRowClick = (taskId: string) => {
		let isSelectedById = {...this.props.isSelectedById}
		isSelectedById[taskId] = !isSelectedById[taskId]
		let idsSelected = this.props.tasks.filter(t => isSelectedById[t.id]).map(t => t.id)
		this.props.onSelectTasks(idsSelected)
	}

	/** Render confirm delete dialog. */
	private renderConfirmDelete = () => {
		let countSelected = this.props.tasks.filter(t => this.props.isSelectedById[t.id]).length
		const confirm = 
			<Confirm 
				header='Delete Tasks'
				content={`Are you sure you want to delete ${countSelected} tasks? This action cannot be undone.`}
				confirmButton='Yes'
				cancelButton='No'
				open={this.state.isOpenConfirmDelete}
				onCancel={() => this.setState({isOpenConfirmDelete: false})}
				onConfirm={() => {
					this.setState({isOpenConfirmDelete: false})
					let taskIds = this.props.tasks.map(t => t.id).filter(id => this.props.isSelectedById[id])
					this.props.onDeleteTasks(taskIds)
				}}
			/>
		return confirm
	}

	/** Render task browser menu. */
	private renderMenu = () => {
		const menu =
			<Menu secondary pointing>
				<Menu.Item header content='Browser'/>
			</Menu>
		return menu
	}

	/** Render task browser sub menu. */
	private renderSubMenu = () => {
		const countHiddenTasks = this.props.tasks.filter(t => !this.props.passesFiltersById[t.id]).length
		const countSelectedTasks = this.props.tasks.filter(t => this.props.isSelectedById[t.id]).length
		const filterStatusExcludeValues = this.props.filters.find(f => f.key == 'status').values
		const filterDescriptionValue = this.props.filters.find(f => f.key == 'description').values[0] || ''

		// Helper method to toggle filter dropdown open close.
		const toggleFilterDropdown = () => this.setState({isOpenFilterDropdown: !this.state.isOpenFilterDropdown})

		// Helper method to convert given status to filter icon.
		const statusToIcon = (status: TaskStatus) => filterStatusExcludeValues.some(v => v == status) ? 
			<Icon name='toggle on' color='red' flipped='horizontally'/> : 
			<Icon name='toggle on' color='green'/>

		const buttonAdd = <Button color='blue' icon='add' content='Add'/>
		const dropdownAdd = 
			<Dropdown 
				trigger={buttonAdd}
				icon={null}
				pointing='top left'
				selectOnBlur={false}
				disabled={this.props.tasks.some(t => t.status == 'Concept')}
			>
				<Dropdown.Menu>
					<Dropdown.Header content='Task types'/>
					{this.props.taskTypes.map((taskType, i) => 
						<Dropdown.Item 
							icon='add' 
							key={i} 
							text={taskType} 
							onClick={() => this.handleAddTaskClick(taskType)}
						/>
					)}
				</Dropdown.Menu>
			</Dropdown>
		const buttonFilter = <Button icon='filter' content='Filter' onClick={toggleFilterDropdown}/>
		const dropdownFilter = 
			<Dropdown 
				trigger={buttonFilter}
				icon={null}
				pointing='top left'
				open={this.state.isOpenFilterDropdown}
				onBlur={toggleFilterDropdown}
			>
				<Dropdown.Menu>
					<Header content='Description'/>
					<Input icon='search' iconPosition='left' className='search' value={filterDescriptionValue}
						onChange={(ev, d) => this.handleDescriptionFilterChange(ev, d.value)}
					/>
					<Header content='Status'/>
					<Dropdown.Item icon={statusToIcon('Running')} content='Running' onClick={ev => this.handleStatusFilterClick(ev, 'Running')} />
					<Dropdown.Item icon={statusToIcon('Success')} content='Success' onClick={ev => this.handleStatusFilterClick(ev, 'Success')} />
					<Dropdown.Item icon={statusToIcon('Error')} content='Error' onClick={ev => this.handleStatusFilterClick(ev, 'Error')} />
				</Dropdown.Menu>
			</Dropdown>
		const itemAddAndFilter = 
			<Menu.Item fitted>
				{dropdownAdd}
				{dropdownFilter}
			</Menu.Item>

		const popupSelectAll = 
			<Popup
				trigger={<Button icon='check circle outline' onClick={this.handleSelectAllClick}/>}
				content='Select all visible tasks.'
				position='bottom center'
				inverted
				size='small'
				closeOnTriggerClick
				openOnTriggerClick={false}
				mouseEnterDelay={500}
			/>
		const popupSelectInverse = 
			<Popup
				trigger={<Button icon='dot circle outline' onClick={this.handleSelectInverseClick}/>}
				content='Invert selection.'
				position='bottom center'
				inverted
				size='small'
				closeOnTriggerClick
				openOnTriggerClick={false}
				mouseEnterDelay={500}
			/>
		const popupSelectNone = 
			<Popup
				trigger={<Button icon='circle outline' onClick={this.handleSelectNoneClick}/>}
				content='Clear selection.'
				position='bottom center'
				inverted
				size='small'
				closeOnTriggerClick
				openOnTriggerClick={false}
				mouseEnterDelay={500}
			/>
		const itemSelection = 
			<Menu.Menu>
				<Menu.Item header content='Select'/>
				<Menu.Item fitted>
					<Button.Group>
						{popupSelectAll}
						{popupSelectInverse}
						{popupSelectNone}
					</Button.Group>
				</Menu.Item>
			</Menu.Menu>
					

		const buttonDetails = 	
			<Button icon='zoom' content='Details' disabled={countSelectedTasks != 1} onClick={this.handleViewDetailsClick}/>
		const buttonDelete = 
			<Button icon='trash' content='Delete' onClick={this.handleDeleteClick}/>
		const itemWithSelection = countSelectedTasks == 0 ? null : 
			<Menu.Menu>
				<Menu.Item header content={`With selection (${countSelectedTasks})`}/>
				<Menu.Item fitted>
					<div>
						{buttonDetails}
						{buttonDelete}
					</div>
				</Menu.Item> 
				{this.renderConfirmDelete()}
			</Menu.Menu>
		
		const menu = 
			<Menu secondary>
				{itemAddAndFilter}
				{itemSelection}
				{itemWithSelection}
			</Menu>
		return menu
	}

	/** Render message. */
	private renderMessages = () => {
		const countTotal = this.props.tasks.length
		const countHidden = this.props.tasks.filter(t => !this.props.passesFiltersById[t.id]).length
		
		const filterMessage = (countHidden == 0) ? null : 
			<Message warning size='small'>
				<span>
					{countHidden} out of {countTotal} tasks hidden by filters.
					<a onClick={this.handleFiltersClearClick}> Clear all filters.</a>
				</span>
			</Message>
		return filterMessage
	}

	/** Render task browser table. */
	private renderTable = () => {
		const placeholder = 
			<Table.Row>
				<Table.Cell disabled colSpan={5}>No tasks found.</Table.Cell>
			</Table.Row>
		const items = this.props.tasks
			.filter(t => this.props.passesFiltersById[t.id])
			.map((t, i) => 
				<Table.Row key={i} onClick={() => this.handleTableRowClick(t.id)} active={this.props.isSelectedById[t.id]}>
					<Table.Cell>{taskStatusToIcon(t.status)}{t.status}</Table.Cell>
					<Table.Cell>{t.description}</Table.Cell>
					<Table.Cell>
						<Link to={`tasks/${t.id}`} onClick={ev => ev.stopPropagation()}>{t.id}</Link>
					</Table.Cell>
					<Table.Cell>
						{moment.utc(t.dateCreated).local().format('D-MMM-YYYY HH:mm')}
					</Table.Cell>
					<Table.Cell>{t.type}</Table.Cell>
					<Table.Cell>{t.ownerClientId}</Table.Cell>
				</Table.Row>
			)
		const table = 
			<Table celled selectable fixed singleLine>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell width={2} content='Status'/>
						<Table.HeaderCell width={4} content='Description'/>
						<Table.HeaderCell width={3} content='TaskId'/>
						<Table.HeaderCell width={3} content='Created'/>
						<Table.HeaderCell width={2} content='Type'/>
						<Table.HeaderCell width={2} content='Owner'/>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{items.length > 0 ? items : placeholder}
				</Table.Body>
			</Table>
		return <Segment id='table-tasks'>{table}</Segment>
	}

	/** Default constructor. */
	constructor(props: TaskBrowserProps) {
		super(props)
		this.state = {isOpenConfirmDelete: false, isOpenFilterDropdown: false}
	}

	/** Render this component. */
	render() {
		const header = 
			<Header size='huge'>	
				<Header.Content>
					<Breadcrumb size='huge'>
						<Breadcrumb.Section content='Task Browser'/>
					</Breadcrumb>
					<Header.Subheader content={`Browse tasks that are available for client ${this.props.clientId}.`} />
				</Header.Content>
			</Header>
		const rowHeader = 
			<Grid.Row key='row-header'>
				<Grid.Column width={16}>
					{header}
				</Grid.Column>
			</Grid.Row>
		const rowContent = 
			<Grid.Row key='row-content'>
				<Grid.Column width={16}>
					{this.renderMenu()}
					{this.renderSubMenu()}
					{this.renderMessages()}
					{this.renderTable()}
				</Grid.Column>
			</Grid.Row>
		return [rowHeader, rowContent]
	}
}


/** Map Redux state to component props. */
const mapStateToProps = (state: RootState): Partial<TaskBrowserProps> => ({
	clientId: state.server.clientId, 
	taskTypes: state.tasks.types, 
	tasks: state.tasks.ids
		.map(id => state.tasks.infoItemsById[id])
		.slice().reverse(),   // slice() because reverse() mutates array.
	passesFiltersById: state.tasks.passesFiltersById, 
	isSelectedById: state.tasks.isSelectedById, 
	filters: state.tasks.filters
})


/** Map Redux dispatch to component props. */
const mapDispatchToProps = (dispatch: Dispatch, ownProps: RouteComponentProps<{}>): Partial<TaskBrowserProps> => ({
	onAddTaskConcept: conceptInfo => {
		dispatch(actionCreators.taskMergeInfo(conceptInfo))
		ownProps.history.push(`/tasks/${conceptInfo.id}`)
	},
	onSetFilter: filter => dispatch(actionCreators.taskSetFilter(filter)), 
	onSelectTasks: ids => dispatch(actionCreators.taskSelectIds(ids)), 
	onViewTaskDetails: id => ownProps.history.push(`/tasks/${id}`), 
	onDeleteTasks: ids => ids.forEach(id => dispatch(actionCreators.taskControl(id, 'delete')))
})


/** Export connected component. */
export const TaskBrowserContainer = withRouter(connect(mapStateToProps, mapDispatchToProps)(TaskBrowser))

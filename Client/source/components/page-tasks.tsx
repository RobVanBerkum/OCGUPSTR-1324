import * as React from 'react'
import { Grid } from 'semantic-ui-react'
import { RouteComponentProps } from 'react-router'
import { ServerLogContainer } from './server-log'
import { TaskBrowserContainer } from './task-browser'
import { TaskDetailsContainer } from './task-details'


/** Optional route parameters. */
interface RouteParams {
	taskId?: string
	detailTabId?: string
}


/** Props for page tasks. */
interface PageTasksProps extends RouteComponentProps<RouteParams> {

}


/** Component for page tasks. */
export class PageTasks extends React.Component<PageTasksProps, {}> {

	private renderTaskBrowser = () => {
		return <TaskBrowserContainer/>
	}

	private renderTaskDetails = (taskId: string, detailTabId: string) => {
		return <TaskDetailsContainer taskId={taskId} detailTabId={detailTabId}/>
	}

	render() {
		const taskId = this.props.match.params.taskId
		const detailTabId = this.props.match.params.detailTabId
		const content = taskId ? this.renderTaskDetails(taskId, detailTabId) : this.renderTaskBrowser()
		const grid = 
			<Grid stackable padded>
				<ServerLogContainer/>
				{content}
			</Grid>
		return grid
	}

}

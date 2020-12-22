import * as React from 'react'
import { RouteComponentProps, withRouter } from 'react-router-dom'
import { Menu } from 'semantic-ui-react'
import { Link } from 'react-router-dom'


/** Get build mode, either production or development. */
const getMode = () => {
	return process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
}


/** Describes props for navigation component. */
interface NavigationProps extends RouteComponentProps<{}> {}


/** Component with navigation links. */
const Navigation = (props: NavigationProps) => {
	let path = props.location.pathname
	let modeSuffix = getMode() == 'Production' ? '' : ' (Development)'
	const menu = 
		<Menu fixed='top'>
			<Menu.Item header>{`Genserver${modeSuffix}`}</Menu.Item>
			<Menu.Item name='Login' as={Link} to={`/login`} active={path.startsWith('/login')}/>
			<Menu.Item name='Tasks' as={Link} to={`/tasks`} active={path.startsWith('/tasks')}/>
		</Menu>
	return menu
}


/** Export container component. */
export const NavigationContainer = withRouter(Navigation)

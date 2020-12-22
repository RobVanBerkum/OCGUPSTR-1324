import * as React from 'react'
import { Form, Message, Icon } from 'semantic-ui-react'
import { TextAreaJson } from './textarea-json'
import { TaskInputFolderWatch, TaskOutputFolderWatch, TaskTypeOptionsFolderWatch, TaskType, TaskInput } from './../messaging/messages'
import { TaskInputProps, TaskOutputProps, inputDefaultsByTaskType } from './task-io'


/** Default form input. */
export const defaultTaskInputFolderWatch: TaskInputFolderWatch = {
	description: '',
	watchPath: '',
	fileHandler: null, 
	triggerTaskType: null, 
	triggerTaskInput: null,
	triggerTaskPropertyKey: ''
}


/** Validate input. Returns object of type {success: boolean, errors: string[]}. */
export const validateTaskInputFolderWatch = (input: TaskInputFolderWatch) => {
	let errors = [] as string[]
	if (!input.description || input.description == '') { errors.push('description cannot be empty.') }
	if (!input.watchPath || input.watchPath == '') { errors.push('watchPath cannot be empty.') }
	if (!input.fileHandler) { errors.push('fileHandler cannot be empty.') }
	if (input.fileHandler == 'TriggerTaskHandler') {
		if (!input.triggerTaskType) { errors.push('If TriggerTaskHandler is used, triggerTaskType cannot be empty.') }
		if (!input.triggerTaskInput) { errors.push('If TriggerTaskHandler is used, triggerTaskInput cannot be empty.') }
		if (!input.triggerTaskPropertyKey) { errors.push('If TriggerTaskHandler is used, triggerTaskPropertyKey cannot be empty.') }
	}
	return {success: (errors.length == 0), errors: errors}
}


/** Describes props for input folder watch component. */
interface InputFolderWatchProps extends TaskInputProps {
	readOnly: boolean
	options: TaskTypeOptionsFolderWatch
	input: TaskInputFolderWatch
	onChange: (input: Partial<TaskInputFolderWatch>) => void
}


/** Component for viewing or editing input for folder watch task. */
export const InputFolderWatch = (props: InputFolderWatchProps) => {
	
	// Convert input, which may be null, to strings.
	const inputStrings = {
		description: props.input && props.input.description ? props.input.description : '', 
		watchPath: props.input && props.input.watchPath ? props.input.watchPath : '',
		fileHandler: props.input && props.input.fileHandler ? props.input.fileHandler : '', 
		triggerTaskType: props.input && props.input.triggerTaskType ? props.input.triggerTaskType : '',
		triggerTaskPropertyKey: props.input && props.input.triggerTaskPropertyKey ? props.input.triggerTaskPropertyKey : ''	
	}

	// Handler to process change in some part of the input.
	const handleChange = (input: Partial<TaskInputFolderWatch>) => {
		if (input.triggerTaskType) {
			input.triggerTaskInput = inputDefaultsByTaskType[input.triggerTaskType]
			input.triggerTaskPropertyKey = props.options.triggerTasks
				.filter(v => v.type == input.triggerTaskType)[0].propertyKey
		}
		props.onChange(input)
	}

	// Build form and return.
	const inputDescription = 
		<Form.Input label='Short description to identify this task' 
			value={inputStrings.description}
			onChange={(ev, d) => handleChange({description: d.value})} 
			readOnly={props.readOnly}
		/>
	const inputWatchPath = 
		<Form.Input 
			label='Fully specified folder to watch'
			value={inputStrings.watchPath}
			onChange={(ev, d) => handleChange({watchPath: d.value})}
			readOnly={props.readOnly}
		/>
	const inputFileHandlerEditable = 
		<Form.Dropdown 
			label='Handler for detected files'
			placeholder='Select file handler'
			selection
			options={props.options.fileHandlers.map(
				(v, i) => ({key: i, text: v, value: v})
			)}
			value={inputStrings.fileHandler}
			onChange={(ev, d) => handleChange({fileHandler: d.value as 'GenperlStartfileHandler'|'TriggerTaskHandler'})}
			selectOnBlur={false}
		/>
	const inputFileHandlerReadonly = 
		<Form.Input 
			label='Handler for detected files'
			value={inputStrings.fileHandler}
			readOnly
		/>
	const inputFileHandler = props.readOnly ? inputFileHandlerReadonly : inputFileHandlerEditable
	const inputTriggerTaskTypeEditable = 
		<Form.Dropdown 
			label='Trigger task type'
			placeholder='Select task type'
			selection
			options={props.options.triggerTasks.map(
				(v, i) => ({key: i, text: v.type, value: v.type})
			)}
			value={inputStrings.triggerTaskType}
			onChange={(ev, d) => handleChange({triggerTaskType: d.value as TaskType})}
			selectOnBlur={false}
		/>
	const inputTriggerTaskTypeReadonly = 
		<Form.Input 
			label='Trigger task type'
			value={inputStrings.triggerTaskType}
			readOnly
		/>
	const inputTriggerTaskInput = 
		<TextAreaJson 
			label='Trigger task input template'
			input={props.input ? props.input.triggerTaskInput : null}
			readOnly={props.readOnly}
			onChange={obj => handleChange({triggerTaskInput: obj as TaskInput})}
		/>
	const inputTriggerTaskPropertyKeyEditable = 
		<Form.Dropdown
			label='Trigger task property key whose value will be set to full path of detected file'
			placeholder='Select property key'
			selection
			options={props.options.triggerTasks.filter(v => v.type == inputStrings.triggerTaskType).map(
				(v, i) => ({key: i, text: v.propertyKey, value: v.propertyKey})
			)}
			value={inputStrings.triggerTaskPropertyKey}
			onChange={(ev, d) => handleChange({triggerTaskPropertyKey: d.value.toString()})}
			selectOnBlur={false}
		/>
	const inputTriggerTaskPropertyKeyReadonly = 
		<Form.Input 
			label='Property key whose value will be set to full path of detected file'
			value={inputStrings.triggerTaskPropertyKey}
			readOnly
		/>
	const groupStartFile = !(props.input && props.input.fileHandler == 'GenperlStartfileHandler') ? 
		<div/> : 
		<div>
			<Message size='small'>
				<Icon name='help circle'/>
				This file handler assumes detected files are start files and contain genperl commands. It triggers new genperl tasks.
			</Message>
		</div>
	const groupTriggerTask = !(props.input && props.input.fileHandler == 'TriggerTaskHandler') ? 
		<div/> : 
		<div>
			<Message size='small'> 
				<Icon name='help circle'/>
				This file handler triggers a new task based on an input template and passes the full path to the detected file as one of the task's properties.
			</Message>
			{props.readOnly ? inputTriggerTaskTypeReadonly : inputTriggerTaskTypeEditable}
			{inputTriggerTaskInput}
			{props.readOnly ? inputTriggerTaskPropertyKeyReadonly : inputTriggerTaskPropertyKeyEditable}
		</div>
	const form = 
		 <Form className={props.readOnly ? 'readonly' : ''}>
			{inputDescription}
			{inputWatchPath}
			{inputFileHandler}
			{groupStartFile}
			{groupTriggerTask}
		</Form>
	return form
}


/** Describes props for output genperl component.*/
interface OutputFolderWatchProps extends TaskOutputProps {
	output: TaskOutputFolderWatch
}


/** Component for viewing output of FolderWatch task. Returns a Form. */
export const OutputFolderWatch = (props: OutputFolderWatchProps) => {
	const form = 
		<Form className={'readonly'}>
			<Form.TextArea 
				label='Raw output'
				value={props.output != null ? JSON.stringify(props.output, null, 2) : 'No output.'}
				autoHeight
				readOnly
				rows={3}
			/>
		</Form>
	return form
}

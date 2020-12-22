import * as React from 'react'
import { Form, Message, List, Header, Button } from 'semantic-ui-react'
import { TaskInputGenperl, TaskOutputGenperl, TaskTypeOptionsGenperl } from './../messaging/messages'
import { TaskInputProps, TaskOutputProps } from './task-io'


/** Default form input. */
export const defaultTaskInputGenperl: TaskInputGenperl = {
	description: '', 
	pathGendsc: '',
	runLocal: false,
	useDynamo: false,
	useGensimulDev: false,
	useDynamoDev: false,
	gensimulVersion: 'Default',
	dynamoVersion: 'Default'
}


/** Validate input. Returns object of type {success: boolean, errors: string[]}. */
export const validateTaskInputGenperl = (input: TaskInputGenperl) => {
	let errors = [] as string[]
	let isValidLinuxPath = (source: string) => 
		source.toLowerCase().endsWith('.gendsc') && 
		!source.includes('\\') && 
		(source.trim() == source)
	if (input.description == '') {
		errors.push('description cannot be empty.')
	}
	if (input.pathGendsc == '') { 
		errors.push('pathGendsc cannot be empty.') 
	} else if (!isValidLinuxPath(input.pathGendsc)) {
		errors.push('pathGendsc is not valid. Please enter the full Linux path to your gendsc file.')
	}
	if (input.gensimulVersion == '') { errors.push('gensimulVersion cannot be empty.') }
	if (input.useDynamo && input.dynamoVersion == '') { 
		errors.push('If useDynamo is enabled, dynamoVersion cannot be empty.') 
	}
	return {success: (errors.length == 0), errors: errors}
}


/** Describes props for input genperl component. */
interface InputGenperlProps extends TaskInputProps {
	readOnly: boolean
	options: TaskTypeOptionsGenperl
	input: TaskInputGenperl
	onChange: (input: Partial<TaskInputGenperl>) => void
}


/** Component for viewing or editing input for Genperl task. Returns a Form. */
export const InputGenperl = (props: InputGenperlProps) => {

	// Helper method for handling change in some part of the input. 
	const handleChange = (input: Partial<TaskInputGenperl>) => {
		if (input.useGensimulDev != null) {
			input.gensimulVersion = defaultTaskInputGenperl.gensimulVersion
		}
		if (input.useDynamoDev != null) {
			input.dynamoVersion = defaultTaskInputGenperl.dynamoVersion
		}
		props.onChange(input)
	}
	
	const input = props.input ? props.input : defaultTaskInputGenperl

	const itemDescription = 
		<Form.Input label='Short description to identify this task' 
			value={input.description}
			onChange={(ev, d) => handleChange({description: d.value})} 
			readOnly={props.readOnly}
		/>

	const versionToOption = (version: string) => ({key: version, text: version, value: version})
	const gensimulVersionOptions = (
		input.useGensimulDev ? 
			props.options.gensimulVersionsDev : 
			props.options.gensimulVersions
		).map(versionToOption)
	const dynamoVersionOptions = (
		input.useDynamoDev ? 
			props.options.dynamoVersionsDev : 
			props.options.dynamoVersions
		).map(versionToOption)

	const itemGensimulVersionEditable = 
		<Form.Dropdown 
			inline
			placeholder='Select version'
			search
			selection
			options={gensimulVersionOptions}
			value={input.gensimulVersion}
			onChange={(ev, d) => handleChange({gensimulVersion: d.value.toString()})}
			selectOnBlur={false}
		/>
	const itemGensimulVersionReadonly = 
		<Form.Input 
			inline
			value={input.gensimulVersion == '' ? 'Default' : input.gensimulVersion}
			readOnly
		/>
	const itemGenSimulVersion = props.readOnly ? 
		itemGensimulVersionReadonly : itemGensimulVersionEditable
	const itemDynamoVersionEditable = 
		<Form.Dropdown 
			inline
			placeholder='Select version'
			search
			selection
			disabled={!input.useDynamo}
			options={dynamoVersionOptions}
			value={input.dynamoVersion}
			onChange={(ev, d) => handleChange({dynamoVersion: d.value.toString()})}
			selectOnBlur={false}
		/>
	const itemDynamoVersionReadonly = 
		<Form.Input 
			inline
			value={input.dynamoVersion == '' ? 'Default' : input.dynamoVersion}
			disabled={!input.useDynamo}
			readOnly
		/>
	const itemDynamoVersion = props.readOnly ? 
		itemDynamoVersionReadonly : itemDynamoVersionEditable
	const itemPathGendsc = 
		<Form.Input label='Full Linux path to gendsc file' 
			value={input.pathGendsc}
			onChange={(ev, d) => handleChange({pathGendsc: d.value})} 
			readOnly={props.readOnly}
		/>
	const itemRunLocal = 
		<Form.Group>
			<Form.Radio label='Run on load-sharing facility' inline
				name='radioGroupRunLocal'
				checked={!input.runLocal}
				onChange={(ev, d) => handleChange({runLocal: !d.checked})} 
				readOnly={props.readOnly}
			/>
			<Form.Radio label='Run on local (server) machine' inline 
				name='radioGroupRunLocal'
				checked={input.runLocal}
				onChange={(ev, d) => handleChange({runLocal: d.checked})}
				readOnly={props.readOnly}
			/>
		</Form.Group>
	const itemUseDynamo = 
		<Form.Checkbox 
			label={'Use Dynamo'} 
			checked={input.useDynamo}
			onChange={(ev, d) => handleChange({useDynamo: d.checked})}
			readOnly={props.readOnly}
		/>
	const itemUseGensimulDev = 
		<Form.Checkbox 
			label={'Use Gensimul dev version'}
			checked={input.useGensimulDev}
			onChange={(ev, d) => handleChange({useGensimulDev: d.checked})}
			readOnly={props.readOnly}
		/>
	const itemUseDynamoDev = 
		<Form.Checkbox 
			label={'Use Dynamo dev version'}
			checked={input.useDynamoDev}
			onChange={(ev, d) => handleChange({useDynamoDev: d.checked})}
			readOnly={props.readOnly}
			disabled={!input.useDynamo}
		/>

	const form = 
		 <Form className={props.readOnly ? 'readonly' : ''}>
		 	{itemDescription}
		 	{itemPathGendsc}
		 	{itemRunLocal}
		 	{itemUseDynamo}
		 	<Form.Field label='Gensimul version'/>
	 		{itemUseGensimulDev}
	 		{itemGenSimulVersion}
	 		<Form.Field label='Dynamo version'/>
	 		{itemUseDynamoDev}
	 		{itemDynamoVersion}
		</Form>
	return form	
}

/** Describes props for output genperl component.*/
interface OutputGenperlProps extends TaskOutputProps {
	output: TaskOutputGenperl
}

/** Component for viewing output of Genperl task. Returns a Form. */
export const OutputGenperl = (props: OutputGenperlProps) => {
	const placeholder = <Message header='No output' content={`This task's output is empty. Check logging tab for more details.`}/>
	if (!props.output || props.output.pathOutput == '') return placeholder

	// Helper methods for opening preformatted text in new tab. 
	const openTextInNewTab = (text: string, title: string) => {
		let win = window.open()
		win.document.write(`<pre>${text}</pre>`)
		win.document.title = title
	}
	const openLogFile = () => {
		let content = props.output.contentsLogTextFile
		let filename = props.output.filesOutput.find(v => v.toLowerCase().endsWith('_log.txt'))
		openTextInNewTab(content, filename)
	}
	const openErrorFile = () => {
		let content = props.output.contentsErrorTextFile
		let filename = props.output.filesOutput.find(v => v.toLowerCase().endsWith('_err.txt'))
		openTextInNewTab(content, filename)
	}

	// Build form items. Use className="field" for correct spacing. 
	const itemPathOutput = 
		<Form.Input label='Full path to output' 
			value={props.output.pathOutput}
			readOnly={true}
		/>
	const itemsFilesOutput = 
		props.output.filesOutput.map((filename, i) => <List.Item key={i} icon='file text outline' content={filename}/>)
	const itemListFilesOutput = 
		<div className="field">
			<Form.Field label='Files in output folder at time of finish (snapshot)'/>
			<List items={itemsFilesOutput} />		
		</div>
	const itemLogAndErrorContents = 
		<div className="field">
			<Form.Field label='Log and error file contents (snapshot)' />
			<Button 
				content='View _log.txt' 
				icon='external'
				disabled={!props.output.contentsLogTextFile}
				onClick={openLogFile} />
			<Button 
				content='View _err.txt'
				icon='external'
				disabled={!props.output.contentsErrorTextFile}
				onClick={openErrorFile} />
		</div>

	// Combine and return. 
	const form = 
		<Form className={'readonly'}>
			{itemPathOutput}
			{itemLogAndErrorContents}
			{itemListFilesOutput}
		</Form>
	return form
}

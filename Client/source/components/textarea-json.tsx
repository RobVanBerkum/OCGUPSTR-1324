import * as React from 'react'
import { Form, Button, Modal, Message } from 'semantic-ui-react'


/** Props for text area json component. */
export interface TextAreaJsonProps {
	label: string
	input: Object
	onChange: (obj: Object) => void
	readOnly: boolean
}


/** State for text area json component. */
interface TextAreaJsonState {
	jsonString: string
	jsonError: string
	jsonEditorOpen: boolean
}


/** Show object as JSON in textarea with button to open editor in a modal. Designed
    to be used inside a Form element. */
export class TextAreaJson extends React.Component<TextAreaJsonProps, TextAreaJsonState> {

	/** Convert given input object to JSON string. */
	private inputToString = (input: Object) => {
		return input ? JSON.stringify(input, null, 2) : ''
	}

	/** Open editor. */
	private handleEditorOpen = () => {
		this.setState({
			jsonEditorOpen: true, 
			jsonString: this.inputToString(this.props.input), 
			jsonError: ''
		})		
	}

	/** Close editor. If save, JSON string is assumed valid input object. */
	private handleEditorClose = (save: boolean) => {
		if (save) {
			let input = JSON.parse(this.state.jsonString)
			this.props.onChange(input)
		}
		this.setState({jsonEditorOpen: false})
	}

	/** Process change in editor. Try to parse value as JSON, write any error to state. */
	private handleEditorChange = (value: string) => {
		let obj: any
		let errorMsg = ''
		try {
			obj = JSON.parse(value)
		} catch (err) {
			errorMsg = (err as Error).message
		}
		if (errorMsg == '') {
			for (let keyInput in this.props.input) {
				if (!Object.keys(obj).some(key => key == keyInput)) {
					errorMsg = `Missing property ${keyInput}.`
					break
				} else {
					let typeExpected = typeof (this.props.input as any)[keyInput]
					let typeActual = typeof obj[keyInput]
					if (typeActual != typeExpected) {
						errorMsg = `Property ${keyInput} has type ${typeActual}, expected type ${typeExpected}.`
					}
				}
			}
		}
		if (errorMsg == '') {
			for (let keyObj in obj) {
				if (!Object.keys(this.props.input).some(key => key == keyObj)) {
					errorMsg = `Unknown property ${keyObj}.`
					break
				}
			}
		}
		this.setState({jsonString: value, jsonError: errorMsg})
	}

	/** Default constructor. */
	constructor(props: TextAreaJsonProps) {
		super(props)
		this.state = {jsonEditorOpen: false, jsonString: '', jsonError: ''}
	}

	/** Render this component. */
	render() {
		const textareaReadonly = 
			<Form.TextArea 
				value={this.inputToString(this.props.input)}
				label={this.props.label}
				autoHeight
				rows={3}
				readOnly
			/>
		const buttonEdit = this.props.readOnly ? <div/> :
			<Form.Button 
				content='Edit' 
				basic
				disabled={!this.props.input}
				onClick={this.handleEditorOpen}
			/>
		const modalEditor = 
			<Modal 
				open={this.state.jsonEditorOpen} 
				closeOnEscape
				onClose={() => this.handleEditorClose(false)}
				size='small'
			>
				<Modal.Header content={`Edit ${this.props.label}`}/>
				<Modal.Content>
					<Form>
						<Form.TextArea
							value={this.state.jsonString}
							autoHeight
							rows={3}
							onChange={(ev, d) => this.handleEditorChange(d.value.toString())}
						/>
						<Form.Field>
							{this.state.jsonError == '' ? <div/> : <Message
								content={this.state.jsonError}   
								negative
								size='small'
							/>}
						</Form.Field>
					</Form>
				</Modal.Content>
				<Modal.Actions>
					<Button content='Cancel' onClick={() => this.handleEditorClose(false)} />
					<Button primary content='Save' onClick={() => this.handleEditorClose(true)} disabled={this.state.jsonError != ''}/>
				</Modal.Actions>
			</Modal>

		return <Form.Field>
			{textareaReadonly}
			{buttonEdit}
			{modalEditor}
		</Form.Field>
	}

}
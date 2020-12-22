import { TaskTypeOptions, TaskInput, TaskOutput, TaskType } from './../messaging/messages'
import { InputGenperl, OutputGenperl, defaultTaskInputGenperl, validateTaskInputGenperl } from './task-io-genperl'
import { InputFolderWatch, OutputFolderWatch, defaultTaskInputFolderWatch, validateTaskInputFolderWatch } from './task-io-folder-watch'


/** Describes props for general task input component. */
export interface TaskInputProps {
	readOnly: boolean
	options: TaskTypeOptions
	input: TaskInput
	onChange: (input: Partial<TaskInput>) => void
}

/** Describes props for general task output component. */
export interface TaskOutputProps {
	output: TaskOutput
}


/** Export collection of input validators for each task type. */
export const inputValidatorsByTaskType: {[type in TaskType]: (input: TaskInput) => {success: boolean, errors: string[]}} = {
	Genperl: validateTaskInputGenperl, 
	FolderWatch: validateTaskInputFolderWatch
}


/** Export collection of input component classes for each task type. */
export const inputClassesByTaskType: {[type in TaskType]: React.StatelessComponent<TaskInputProps>} = {
	Genperl: InputGenperl,
	FolderWatch: InputFolderWatch
}


/** Export collection of input defaults for each task type. */
export const inputDefaultsByTaskType: {[type in TaskType]: TaskInput} = {
	Genperl: defaultTaskInputGenperl,
	FolderWatch: defaultTaskInputFolderWatch
}


/** Export collection of output component classes for each task type. */
export const outputClassesByTaskType: {[type in TaskType]: React.StatelessComponent<TaskOutputProps>} = {
	Genperl: OutputGenperl,
	FolderWatch: OutputFolderWatch
}
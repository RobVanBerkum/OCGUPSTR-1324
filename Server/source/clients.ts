import * as crypto from 'crypto'
import { ILogger, LogLevel } from './logging'


/** Collection of client types. */
export enum ClientType {
	User = 'User',
	Admin = 'Admin'
}


/** Describes a client. */
export interface IClient {
	id: string
	type: ClientType
}


/** Describes client manager functionality. 
	Future improvement: Use database like sqlite3 to store client info. */
export interface IClientManager {
	validateClient: (clientId: string) => boolean
	getClient: (clientId: string) => IClient
	generateToken: (clientId: string) => string
	tokenToClient: (token: string) => IClient
	deleteToken: (token: string, clientId: string) => void
}


/** Provides client manager functionality. 
	We simply have 2 clients: Admin and User. They are not password protected. 
	In the future this may change. */
export class ClientManager implements IClientManager {
	private logger: ILogger
	private clients: IClient[]
	private clientsAuthorized: Map<string, IClient>

	/** Default constructor. */
	constructor(logger: ILogger) {
		this.logger = logger
		this.clients = [
			{id: 'Admin', type: ClientType.Admin},
			{id: 'User', type: ClientType.User}
		]
		this.clientsAuthorized = new Map<string, IClient>()
	}

	/** Returns true iff given client exists. */
	validateClient = (clientId: string) => {
		return this.clients.some(c => c.id == clientId)
	}

	/** Return client for given id. */
	getClient = (clientId: string) => {
		return this.clients.find(c => c.id == clientId)
	}

	/** Authorize client with new random token and return that token. 
	    Based on 
	    <https://stackoverflow.com/questions/8855687/secure-random-token-in-node-js>. 
		Current approach is not very secure, see also 
		<https://stackoverflow.com/questions/20963273/spa-best-practices-for-authentication-and-session-management>.
	*/
	generateToken = (clientId: string) => {
		let client = this.clients.find(c => c.id == clientId)
		if (!client) { throw new Error(`Client with id ${clientId} does not exist.`) } 
		let token = crypto.randomBytes(32).toString('hex')
		this.clientsAuthorized.set(token, client)
		this.logger.log(LogLevel.Info, `Token request authorized for client ${clientId}.`)
		return token
	}

	/** Find client authorized by given token. */
	tokenToClient = (token: string) => {
		let client = this.clientsAuthorized.get(token)
		if (!client) { throw new Error(`Invalid token ${token}.`) }
		return client
	}

	/** Delete given token. */
	deleteToken = (token: string, clientId: string) => {
		this.clientsAuthorized.delete(token)
		this.logger.log(LogLevel.Info, `Token deleted for client ${clientId}.`)
	}
}

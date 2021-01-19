import { IMessageHandler, IMessage, MessageFactory } from './../messaging/messages'


/** Communicator handles server communication over websockets. */
export class Communicator {
	private static instance: Communicator
	private readonly wsPort: number
	private readonly wsUrl: string
	private readonly msgTypeAny = 'ANY'
	private ws: WebSocket
	private wsCloseHandler = () => {}
	private msgHandlers: {msgType: string, handler: IMessageHandler<any>}[]

	/** Default constructor. */
	private constructor() {
		this.wsPort = process.env.NODE_ENV === 'production' ? 8081 : 8080
		this.wsUrl = `ws://${window.location.hostname}:${this.wsPort}`
		this.msgHandlers = []
	}

	/** Return singleton instance. */
	static getInstance = () => {
		if (!Communicator.instance) {
			Communicator.instance = new Communicator()
		}
		return Communicator.instance
	}

	/** Get WebSocket listener. */
	private getWs = async () => {
		if (this.ws && this.ws.readyState == WebSocket.OPEN) {
			return this.ws
		} else {
			let ws = new WebSocket(this.wsUrl)
			let waitForOpen = new Promise<void>((resolve, reject) => {
				let timer = setTimeout(() => reject('WebSocket open timeout.'), 3000)
				ws.onopen = () => {
					clearTimeout(timer)
					resolve()
				}
			})
			try {
				await waitForOpen
				this.ws = ws
				this.ws.onmessage = this.handleWsMessage
				this.ws.onclose = this.wsCloseHandler
				return this.ws
			} catch(error) {
				throw new Error(error)
			}
		}
	}

	/** Handle any incoming websocket message. */
	private handleWsMessage = (event: MessageEvent) => {
		try {
			let msg = MessageFactory.fromJson(event.data)
			this.msgHandlers
				.filter(h => (h.msgType == msg.type || h.msgType == this.msgTypeAny))
				.forEach(h => h.handler(msg))
		}
		catch (error) {
			let err = error as Error
			console.log(`Websocket: Failed to handle incoming message: ${err.message}.`)
			console.log(err.stack)
		}
	}

	/** Close websocket connection without calling ws close handler. */
	closeWs = () => {
		if (this.ws) {
			this.ws.onclose = null
			this.ws.close()
		}
	}

	/** Assign a handler that is called when the WebSocket connection closes. */
	setWsCloseHandler = (handler: () => void) => {
		this.wsCloseHandler = handler
	}

	/** Add given message handler for specific message type. */
	addMessageHandler = <M extends IMessage>(ctor: {new(): M}, handler: IMessageHandler<M>) => {	
		let msgType = new ctor().type
		this.msgHandlers.push({msgType, handler})
	}

	/** Remove given message handler. */
	removeMessageHandler = <M extends IMessage>(handler: IMessageHandler<M>) => {
		this.msgHandlers = this.msgHandlers.filter(h => h.handler != handler)
	}

	/** Clear all message handlers for specific message class. */
	clearMessageHandler = <M extends IMessage>(ctor: {new(): M}) => {
		let msgType = new ctor().type
		this.msgHandlers = this.msgHandlers.filter(h => h.msgType != msgType)
	}

	/** Send the given message to the server. */
	sendMessage = async (msg: IMessage) => {
		let ws = await this.getWs()
		ws.send(MessageFactory.toJson(msg))
	}

	/** Send the given message to server and return the first response that passes the given validator. */
	sendMessageAndWaitForResponse = async (msg: IMessage, responseValidator: (response: IMessage) => boolean, timeoutMs = 3000) => {
		const waitForTimeout = new Promise(resolve => setTimeout(resolve, timeoutMs))
		let ws = await this.getWs()
		let waitForResponse: Promise<IMessage> = new Promise((resolve, reject) => {
			let responseHandler = (response: IMessage) => {
				if (responseValidator(response)) {
					this.msgHandlers = this.msgHandlers.filter(h => h.handler != responseHandler)
					resolve(response)
				}
			}
			this.msgHandlers.push({msgType: this.msgTypeAny, handler: responseHandler})
			waitForTimeout.then(() => {
				this.msgHandlers = this.msgHandlers.filter(h => h.handler != responseHandler)
				reject(new Error(`Response message timeout after ${timeoutMs}ms.`))
			})
		})
		ws.send(MessageFactory.toJson(msg))
		let response = await waitForResponse
		return response
	}
}

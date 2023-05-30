const avaliablePlayers = []
const liveMatchs = []
const socketIndexer = new Map()

const SERVER_TICK = 1000/30
const MAX_POINTS = 10
const DEFAULT_SPEED = 10
const WIDTH = 600
const HEIGHT = 480
const PADDLE_HEIGHT = 100
const PADDLE_WIDTH = 10
const BALL_SIZE = 10

function State() {
	this.ended = false
	this.lScore = 0
	this.rScore = 0
	this.lPaddleY = 0
	this.rPaddleY = 0
	this.ballX = 0
	this.ballY = 0
	this.speedX = 0
	this.speedY = 0
}

function Match(lSocket, rSocket) {
	this.lSocket = lSocket
	this.rSocket = rSocket
	this.state = new State()

	socketIndexer.set(lSocket, this)
	socketIndexer.set(rSocket, this)

	this.centerBall()
}

Match.prototype.centerBall = function() {
	this.state.ballX = (WIDTH-BALL_SIZE)*0.5
	this.state.ballY = (HEIGHT-BALL_SIZE)*0.5
	this.state.speedX = Math.random() > 0.5 ? DEFAULT_SPEED : -DEFAULT_SPEED
	this.state.speedY = Math.random() > 0.5 ? DEFAULT_SPEED : -DEFAULT_SPEED
	this.state.lPaddleY = (HEIGHT-PADDLE_HEIGHT)*0.5
	this.state.rPaddleY = this.state.lPaddleY
};

Match.prototype.updatePaddle = function(socket, data) {
	const position = Number(data)

	if(position != NaN) {
		// clamp position
		const normalized = Math.max(0, Math.min(HEIGHT-PADDLE_HEIGHT, position))

		if(socket == this.lSocket) this.state.lPaddleY = normalized
		else if(socket == this.rSocket) this.state.rPaddleY = normalized
	} 
}

Match.prototype.endMatch = function() {
	this.state.ended = true
	liveMatchs.splice(liveMatchs.indexOf(this), 1)

	// remove the possibility of reciving messages from the sockets
	socketIndexer.delete(this.lSocket)
	socketIndexer.delete(this.rSocket)

	// in case of win, send the last state containing the ended flag as false
	this.emit()

	// close the sockets
	this.lSocket.end()
	this.rSocket.end()
}

Match.prototype.tick = function() {
	this.state.ballX += this.state.speedX
	this.state.ballY += this.state.speedY

	// check for collision
	if(this.state.ballX < 0) {
		this.state.rScore++
		this.centerBall()
	} else if(this.state.ballX > WIDTH-BALL_SIZE) {
		this.state.lScore++
		this.centerBall()
	}

	// bounce top and bottom
	if(this.state.ballY < 0 || this.state.ballY > HEIGHT-BALL_SIZE) {
		this.state.speedY *= -1
	}

	// bounce paddles
	if(
		(this.state.ballX < PADDLE_WIDTH &&
		this.state.ballY > this.state.lPaddleY &&
		this.state.ballY < this.state.lPaddleY+PADDLE_HEIGHT) ||
		(this.state.ballX > WIDTH-PADDLE_WIDTH-BALL_SIZE &&
		this.state.ballY > this.state.rPaddleY &&
		this.state.ballY < this.state.rPaddleY+PADDLE_HEIGHT)
	){
		this.state.speedX *= -1
	}

	this.emit()

	if(this.state.lScore == MAX_POINTS || this.state.rScore == MAX_POINTS) {
		this.endMatch()
	}
}

Match.prototype.emit = function() {
	const payload = JSON.stringify(this.state)
	const buffer = Buffer.alloc(2 + payload.length)

	buffer[0] = 0x81
	buffer[1] = payload.length
	buffer.write(payload, 2)

	this.lSocket.write(buffer)
	this.rSocket.write(buffer)
}

module.exports.onLogin = function(socket) {
	let pair = avaliablePlayers.pop()

	if(pair == undefined) avaliablePlayers.push(socket) // put on wait queue
	else liveMatchs.push(new Match(pair, socket)) // start game between two fellas
}

module.exports.onMessage = function(socket, buffer) {
	socketIndexer.get(socket)?.updatePaddle(socket, buffer)
}

module.exports.onDisconnect = function(socket) {
	socketIndexer.get(socket)?.endMatch()
}

module.exports.startLoop = function() {
	setInterval(() => {
		for(let i = 0; i < liveMatchs.length; i++) {
			liveMatchs[i].tick()
		}
	}, SERVER_TICK);
}

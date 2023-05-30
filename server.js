const http = require("node:http")
const net = require("node:net")
const crypto = require("node:crypto")
const fs = require("node:fs")
const game = require("./game")

const server = http.createServer((req, res) => {
    // send index html for all request
    res.writeHead(200, {"Content-Type": "text/html"})
    res.end(fs.readFileSync("./public/index.html"))
})

server.listen(1234, "127.0.0.1", () => {
    game.startLoop()
})

server.on("upgrade", (req, socket) => {
    const headers = req.headers

    // requesting for an upgrade
    if(headers.upgrade == "websocket") {
        const guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        const websocketKey = headers["sec-websocket-key"]
        const acceptanceKey = crypto
            .createHash("sha1")
            .update(websocketKey+guid)
            .digest("base64")

        // accept handshake - welcome my babe ʕっ•ᴥ•ʔっ
        socket.write([
            "HTTP/1.1 101 Switching Protocols",
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Accept: ${acceptanceKey}`,
            "\r\n"
        ]
        .join("\r\n"))

        game.onLogin(socket)

        let waitingPong = false
        
        // client websocket 'emit'
        socket.on("data", (data) => {
            const opcode = data[0] & 0x0F

            switch(opcode) {
                case 0x01: game.onMessage(socket, unpackSingleFrame(data))
                break
                // since i implemented this fella, no browser has sent that opcode ¯\_(ツ)
                case 0x09: socket.write(Buffer.from([0x8A, 0x00]))
                break
                case 0x0a: waitingPong = false // glad to know that you are \( ﾟヮﾟ)/
                break
                default: socket.destroy()
                break
            }
        })

        const pingInterval = setInterval(() => {
            if(!socket.writable) return // socket already interrupted - miss you babe (︶︹︶)

            // don't has responded yeat since last ping - (ಠ_ಠ)╭∩╮ i don't need you anymore
            if(waitingPong) socket.destroy()

            // pinging client - are you still here? (⊙＿⊙')
            socket.write(Buffer.from([0x89, 0x00]))
            waitingPong = true
        }, 10000);

        socket.on("close", () => {
            clearInterval(pingInterval)
            game.onDisconnect(socket)
        })
    }
})

// this function is not for general purposes, it makes a lot of assumptions
// to make my life easier
function unpackSingleFrame(data) {
    const payloadLength = data[1] & 0x7F
    const isMasked = (data[1] & 0x80) === 0x80
    const payloadStartIndex = 2 + (isMasked ? 4 : 0)
    const payload = data.slice(payloadStartIndex)

    if (isMasked) {
        const mask = data.slice(payloadStartIndex - 4, payloadStartIndex)
        for (let i = 0; i < payload.length; i++) {
            payload[i] ^= mask[i % 4]
        }
    }

    return payload
}

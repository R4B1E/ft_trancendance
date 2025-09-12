'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const ServerPlugin = async (fastify, opts) => {
    const topics = new Map();
    const subscriptionsBySocket = new Map();
    const PORT = Number(process.env.PORT) || 8080;
    const wss = new ws_1.WebSocketServer({ port: PORT, maxPayload: 10 * 1024 });
    function safeParse(msg) {
        try {
            const parsed = JSON.parse(msg);
            if (!parsed)
                return null;
            return parsed;
        }
        catch {
            return null;
        }
    }
    wss.on('connection', (socket) => {
        console.log('new client connected');
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });
        socket.on('message', (raw) => {
            const text = typeof raw === 'string' ? raw : raw.toString('utf8');
            const msg = safeParse(text);
            if (!msg) {
                socket.send(JSON.stringify({ error: 'invalid_message' }));
                return;
            }
            switch (msg.event) {
                case 'subscribe': {
                    const channel = msg.channel;
                    if (!topics.has(channel))
                        topics.set(channel, new Set());
                    topics.get(channel).add(socket);
                    if (!subscriptionsBySocket.has(socket))
                        subscriptionsBySocket.set(socket, new Set());
                    subscriptionsBySocket.get(socket).add(channel);
                    console.log('subscribed !!');
                    socket.send(JSON.stringify({ event: 'subscribed', channel, data: `subscribed!` }));
                    break;
                }
                case 'unsubscribe': {
                    const channel = msg.channel;
                    if (!channel)
                        return;
                    topics.get(channel)?.delete(socket);
                    subscriptionsBySocket.get(socket)?.delete(channel);
                    socket.send(JSON.stringify({ event: 'unsubscribed', channel }));
                    break;
                }
                case 'publish': {
                    const channel = msg.channel;
                    const data = msg.data;
                    if (!channel || data === undefined)
                        return;
                    const clients = topics.get(channel);
                    if (!clients)
                        return;
                    const payload = JSON.stringify(data);
                    console.log(payload);
                    for (let client of Array.from(clients.values())) {
                        if (client.readyState !== ws_1.WebSocket.OPEN) {
                            clients.delete(client);
                            subscriptionsBySocket.get(client)?.delete(channel);
                            continue;
                        }
                        if (msg.excludeSelf && client === socket)
                            continue;
                        const buffered = client.bufferedAmount ?? 0;
                        const BUFFERED_LIMIT = 64 * 1024;
                        if (buffered > BUFFERED_LIMIT) {
                            console.warn('skipping send: client bufferedAmount high', buffered);
                            continue;
                        }
                        client.send(JSON.stringify({ channel, data: payload }), (err) => {
                            if (err) {
                                console.error('send error', err);
                            }
                        });
                    }
                    break;
                }
                case 'ping':
                    {
                        socket.send(JSON.stringify({ data: "pong" }));
                        break;
                    }
                default:
                    socket.send(JSON.stringify({ error: 'unknown_event' }));
            }
        });
        socket.on('close', () => cleanupSocket(socket));
        socket.on('error', (err) => {
            console.error('socket error', err);
            cleanupSocket(socket);
        });
    });
    function cleanupSocket(socket) {
        const channels = subscriptionsBySocket.get(socket);
        if (channels) {
            for (const ch of Array.from(channels.values())) {
                const set = topics.get(ch);
                if (set) {
                    set.delete(socket);
                    if (set.size === 0)
                        topics.delete(ch);
                }
            }
        }
        subscriptionsBySocket.delete(socket);
        try {
            socket.terminate();
        }
        catch { }
    }
    const interval = setInterval(() => {
        wss.clients.forEach((socket) => {
            if (socket.isAlive === false) {
                cleanupSocket(socket);
                return;
            }
            socket.isAlive = false;
            try {
                socket.ping();
            }
            catch { }
        });
    }, 30_000);
    process.on('SIGINT', () => {
        console.log('shutting down');
        clearInterval(interval);
        wss.close(() => { console.log('closing socket'); process.exit(0); });
        const timer = setTimeout(() => {
            process.exit(0);
        }, 5000);
        wss.once('close', () => { console.log('clearing timeout'); clearTimeout(timer); });
    });
    wss.on('close', () => {
        console.log('connection closed');
    });
};
exports.default = ServerPlugin;
//# sourceMappingURL=server.js.map
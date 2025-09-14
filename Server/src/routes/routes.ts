// import { RouteOptions } from '@fastify/websocket';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import Ajv from 'ajv'
// import { FastifyRequest } from 'fastify/types/request';
import { WebSocket } from 'ws';

const ajv = new Ajv();
type EventType = 'subscribe' | 'unsubscribe' | 'publish';

type PubData = unknown;

interface PubMessage { channel: string, data: PubData }

interface Pub_Sub_event { event: EventType; channel: string; data?: PubData, excludeSelf?: boolean }

type Channel = Map<string, Set<WebSocket>>;

const topics: Channel = new Map();

const subscriptionsBySocket: Map<WebSocket, Set<string>> = new Map();

function safeParse(msg: string): Pub_Sub_event | null {
    try {
        const parsed = JSON.parse(msg);
        if (!parsed) return null;
        return parsed as Pub_Sub_event;
    } catch {
        return null;
    }
}

async function sendMsg(socket: WebSocket, msg: PubMessage) {
    socket.send(JSON.stringify(msg));
}

// WebSocket message schema
const messageSchema = {
    type: 'object',
    properties: {
        event: {
            type: 'string', enum: [
                'subscribe',
                "unsubscribe",
                "publish"
            ]
        },
        channel: { type: 'string' },
        data: { type: 'object' },
        excludeSelf: { type: 'boolean' }
    },
    required: ['event', 'channel'],
};

function cleanupSocket(socket: WebSocket) {
    console.log('client disconnected')
    const channels = subscriptionsBySocket.get(socket);
    if (channels) {
        for (const ch of Array.from(channels.values())) {
            const set = topics.get(ch);
            if (set) {
                set.delete(socket);
                if (set.size === 0) topics.delete(ch);
            }
        }
    }
    subscriptionsBySocket.delete(socket);
    try {
        socket.close();
    } catch { }
}

const validate = ajv.compile(messageSchema);

const FastifyRoutes: FastifyPluginAsync = async function (fastify: FastifyInstance) {

    fastify.get('/', { websocket: true }, (socket, req) => {
        fastify.log.info(`New client connected`);
        // socket.send('hello client !')
        (socket as any).isAlive = true;
        socket.on('pong', () => {
            (socket as any).isAlive = true;
        })
        socket.on('message', (raw: Buffer | string) => {
            const text = typeof raw === 'string' ? raw : raw.toString('utf-8');
            if (text === "ping")
            {
                socket.send("pong");
                return;
            }
            const msg = safeParse(text);
            if (!validate(msg))
                return sendMsg(socket, { channel: "Error", data: 'Invalid Message Structure.' })

            const { event, channel, data, excludeSelf } = msg;

            switch (event) {
                case 'subscribe': {
                    if (!topics.has(channel))
                        topics.set(channel, new Set());
                    topics.get(channel)!.add(socket);

                    if (!subscriptionsBySocket.has(socket))
                        subscriptionsBySocket.set(socket, new Set());
                    subscriptionsBySocket.get(socket)!.add(channel);
                    break;
                }

                case 'unsubscribe': {
                    topics.get(channel)?.delete(socket);
                    subscriptionsBySocket.get(socket)?.delete(channel);
                    break;
                }

                case 'publish': {
                    const clients = topics.get(channel);
                    if (!clients)
                        return;
                    
                    for (let client of Array.from(clients.values())) {
                        if (client.readyState !== WebSocket.OPEN) {
                            clients.delete(client);
                            subscriptionsBySocket.get(client)?.delete(channel);
                            continue;
                        }

                        if (excludeSelf && client === socket)
                            continue;
                        sendMsg(client, { channel, data });
                    }
                    break;
                }

                default: break;
            }
        })

        socket.on('close', () => cleanupSocket(socket));

        socket.on('error', (err : any) => {
            console.error('socket error', err);
            cleanupSocket(socket);
        })

        const interval = setInterval(() => {
            const clients = Array.from(subscriptionsBySocket.keys());
            for (const client of clients) {
                if ((client as any).isAlive === false) {
                    cleanupSocket(client)
                    return;
                }
                (client as any).isAlive = false;
                try { client.ping(); } catch { }
            }
        }, 30_000)

        process.on('SIGINT', () => {
            clearInterval(interval);
        })
    })
    // const RouteOptions: RouteOptions = {
    //     method: "GET",
    //     url: "/",
    //     websocket: true,
    //     wsHandler: (socket, req: FastifyRequest) => {
    //         fastify.log.info('New client connected');
    //         (socket as any).isAlive = true;
    //         socket.on('pong', () => {
    //             (socket as any).isAlive = true;
    //         })
    //         socket.on('message', (raw: Buffer | string) => {
    //             const text = typeof raw === 'string' ? raw : raw.toString('utf-8');
    //             const msg = safeParse(text);
    //             if (!validate(msg))
    //                 return sendMsg(socket, { channel: "Error", data: 'Invalid Message Structure.' })

    //             const { event, channel, data, excludeSelf } = msg;

    //             switch (event) {
    //                 case 'subscribe': {
    //                     if (!topics.has(channel))
    //                         topics.set(channel, new Set());
    //                     topics.get(channel)!.add(socket);

    //                     if (!subscriptionsBySocket.has(socket))
    //                         subscriptionsBySocket.set(socket, new Set());
    //                     subscriptionsBySocket.get(socket)!.add(channel);
    //                     break;
    //                 }

    //                 case 'unsubscribe': {
    //                     topics.get(channel)?.delete(socket);
    //                     subscriptionsBySocket.get(socket)?.delete(channel);
    //                     break;
    //                 }

    //                 case 'publish': {
    //                     const clients = topics.get(channel);
    //                     if (!clients)
    //                         return;

    //                     for (let client of Array.from(clients.values())) {
    //                         if (client.readyState !== WebSocket.OPEN) {
    //                             clients.delete(client);
    //                             subscriptionsBySocket.get(client)?.delete(channel);
    //                             continue;
    //                         }

    //                         if (excludeSelf && client === socket)
    //                             continue;

    //                         sendMsg(client, { channel, data });
    //                     }
    //                     break;
    //                 }

    //                 case 'ping': {
    //                     sendMsg(socket, { channel, data: "pong" })
    //                     break;
    //                 }
    //                 default: break;
    //             }
    //         })

    //         socket.on('close', () => cleanupSocket(socket));

    //         socket.on('error', (err) => {
    //             console.error('socket error', err);
    //             cleanupSocket(socket);
    //         })

    //         const interval = setInterval(() => {
    //             const clients = Array.from(subscriptionsBySocket.keys());
    //             for (const client of clients) {
    //                 if ((client as any).isAlive === false) {
    //                     cleanupSocket(client)
    //                     return;
    //                 }
    //                 (client as any).isAlive = false;
    //                 try { client.ping(); } catch { }
    //             }
    //         }, 30_000)

    //         process.on('SIGINT', () => {
    //             clearInterval(interval);
    //         })
    //     },
    //     handler: (req, reply) => {
    //         // reply.status(400).send("Bad Request (:")
    //     }
    // }
    // fastify.route(RouteOptions);
}

export default FastifyRoutes
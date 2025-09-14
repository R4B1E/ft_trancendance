'use strict'

import { FastifyRequest } from "fastify/types/request";

const RealtimeServer = function(wss : WebSocket, req : FastifyRequest) {
  type PubData = unknown;

  type EventType = 'subscribe' | 'unsubscribe' | 'publish' | 'ping';
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

  // function sendPayload(data: string, channel: string) : PubData
  // {
  //   return JSON.stringify({channel, data});
  // }

  (wss as any).on('connection', (socket: WebSocket) => {
    console.log('new client connected');

    (socket as any).isAlive = true;

    socket.on('pong', () => {
      (socket as any).isAlive = true;
    });

    socket.on('message', (raw: Buffer | string) => {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8');
      const msg = safeParse(text);
      if (!msg) {
        socket.send(JSON.stringify({ error: 'invalid_message' }));
        return;
      }

      switch (msg.event) {

        case 'subscribe': {
          const channel = msg.channel as string;
          if (!topics.has(channel)) topics.set(channel, new Set());
          topics.get(channel)!.add(socket);

          if (!subscriptionsBySocket.has(socket)) subscriptionsBySocket.set(socket, new Set());
          subscriptionsBySocket.get(socket)!.add(channel);
          // console.log('subscribed !!')
          // socket.send(JSON.stringify({ event: 'subscribed', channel, data: `subscribed!` }));
          break;
        }

        case 'unsubscribe': {
          const channel = msg.channel;
          if (!channel) return;
          topics.get(channel)?.delete(socket);
          subscriptionsBySocket.get(socket)?.delete(channel);
          socket.send(JSON.stringify({ event: 'unsubscribed', channel }));
          break;
        }

        case 'publish': {
          const channel = msg.channel;
          const data = msg.data;
          if (!channel || data === undefined) return;

          const clients = topics.get(channel);
          if (!clients) return;

          const payload = JSON.stringify(data);

          // console.log(payload);

          for (let client of Array.from(clients.values())) {
            if (client.readyState !== WebSocket.OPEN) {
              clients.delete(client);
              subscriptionsBySocket.get(client)?.delete(channel);
              continue;
            }
            if (msg.excludeSelf && client === socket) continue;

            const buffered = (client as any).bufferedAmount ?? 0;
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
      socket.terminate();
    } catch { }
  }

  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if ((socket as any).isAlive === false) {
        cleanupSocket(socket);
        return;
      }
      (socket as any).isAlive = false;
      try { socket.ping(); } catch { }
    });
  }, 30_000);

  process.on('SIGINT', () => {
    console.log('shutting down');
    clearInterval(interval);
    wss.close(() => { console.log('closing socket'); process.exit(0) });
    
    const timer = setTimeout(() => {
      process.exit(0)
    }, 5000);

    wss.once('close', () => {console.log('clearing timeout'); clearTimeout(timer)});
  });

  (wss as any).on('close', () => {
    console.log('connection closed')
  })
}

export default RealtimeServer;
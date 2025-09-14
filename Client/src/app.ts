type Channel = string;

type PubData = object

type EventType = 'subscribe' | 'unsubscribe' | 'publish' | 'ping';

interface PubSubEvent {
    event: EventType;
    channel: Channel;
    data?: PubData;
    excludeSelf?: boolean
}

type MsgHandler = (data: any, raw?: MessageEvent) => void;

function Realtime(serverUrl: string, options?: { reconnect?: boolean; reconnectMaxDelayMs?: number; heartbeatIntervalMs?: number }) {
    let ws: WebSocket | null = null;
    const channelHandlers = new Map<Channel, Set<MsgHandler>>();
    const subscribed = new Set<Channel>();
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let reconnectAttempt = 0;
    let lastPongTime = Date.now();
    const heartbeatIntervalMs = options?.heartbeatIntervalMs ?? 20_000;
    const reconnectMaxDelayMs = options?.reconnectMaxDelayMs ?? 30_000;

    function connect() {
        ws = new WebSocket(serverUrl);
        ws.addEventListener("open", () => {
            console.log('connection established')
            reconnectAttempt = 0;
            subscribed.forEach(ch => {
                send({ event: "subscribe", channel: ch });
            });
            startHeartbeat();
        });

        ws.addEventListener("message", (ev) => {
            if (ev.data === "pong") {
                lastPongTime = Date.now()
            }
            else {
                try {
                    const obj: PubSubEvent = JSON.parse(ev.data);
                    const handlers = channelHandlers.get(obj.channel);
                    if (handlers) {
                        handlers.forEach(h => {
                            try { h(obj.data, ev); } catch (err) { console.error("handler error", err); }
                        });
                    }
                } catch (err) {
                    console.error("invalid message", err, ev.data);
                }
            }
        });
        ws.addEventListener("close", (e) => {
            stopHeartbeat();
            if (options?.reconnect !== false) scheduleReconnect();
        });
        ws.addEventListener("error", (e) => {
            console.warn("ws error", e);
        });
    }

    function scheduleReconnect() {
        reconnectAttempt++;
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), reconnectMaxDelayMs);
        setTimeout(() => {
            connect();
        }, delay);
    }

    function startHeartbeat() {
        stopHeartbeat();
        heartbeatTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) ws.send("ping");
            if (Date.now() - lastPongTime > heartbeatIntervalMs + 5_000)
            {
                console.warn('No pong received in time, reconnecting...');
                if (ws) ws.close();
            }
        }, heartbeatIntervalMs);
    }

    function stopHeartbeat() {
        if (heartbeatTimer != null) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    function send(obj: PubSubEvent) {
        if (!ws) throw new Error("Not connected");
        if (ws.readyState !== WebSocket.OPEN) {
            console.warn("ws not open; message dropped", obj);
            return;
        }
        ws.send(JSON.stringify(obj))
    }

    function onConnection(cb: (ev: Event) => void) {
        if (!ws) connect();
        if (!ws) throw new Error("Failed to create socket");
        ws.addEventListener("open", cb);
    }

    function subscribe(channel: Channel, handler: MsgHandler) {
        if (!channelHandlers.has(channel)) channelHandlers.set(channel, new Set());
        channelHandlers.get(channel)!.add(handler);
        if (!subscribed.has(channel)) {
            subscribed.add(channel);
            send({ event: "subscribe", channel });
        }
        return () => unsubscribe(channel, handler);
    }

    function unsubscribe(channel: Channel, handler?: MsgHandler) {
        const set = channelHandlers.get(channel);
        if (set && handler) {
            set.delete(handler);
            if (set.size === 0) {
                channelHandlers.delete(channel);
                subscribed.delete(channel);
                send({ event: "unsubscribe", channel });
            }
        } else {
            channelHandlers.delete(channel);
            subscribed.delete(channel);
            send({ event: "unsubscribe", channel });
        }
    }

    function publish(channel: Channel, data: PubData, excludeSelf: boolean) {
        send({ event: "publish", channel, data, excludeSelf });
    }

    function destructor(reason?: string) {
        stopHeartbeat();
        if (ws) ws.close(1000, reason);
        ws = null;
    }

    connect();

    return { onConnection, destructor, subscribe, unsubscribe, publish };
}

export default Realtime
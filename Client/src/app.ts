type Channel = string;

type PubData = object

type EventType = 'subscribe' | 'unsubscribe' | 'publish' | 'ping';

interface PubSubEvent {
    event: EventType;
    channel: Channel;
    data?: PubData;
    excludeSelf?: boolean
}

type MsgHandler = (data: any) => void;

/** @brief Function closure that connects to the 
 * Realtime server and returns set of methods that allows 
 * communication with the server
 *
 *  @param serverUrl The Realtime Server Url
 *  @param reconnect Reconnection to the server if an error occurs (true, false)
 *  @param reconnectMaxDelayMs the amount of time to take before proceeding the reconnection 
 *  @param heartbeatIntervalMs Ping/Pong packets delay in Ms 
 *  @return a set of methods allowing pub/sub communication with the server
 */
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
                            try { h(obj.data); } catch (err) { console.error("handler error", err); }
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
            if (Date.now() - lastPongTime > heartbeatIntervalMs + 5_000) {
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

    /** @brief function wrapper around open event 
    * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/open_event)
    *
    *  @param cb callback when the connection with a Websocket is opened
    */
    function onConnection(cb: (ev: Event) => void) {
        if (!ws) connect();
        if (!ws) throw new Error("Failed to create socket");
        ws.addEventListener("open", cb);
    }

    /** @brief function notifying the Realtime server 
     * that client is interested in messages published in a [channel]
    *
    *  @param channel the channel name that the client is wishing to get messages from
    *  @param handler function handler for the event
    */
    function subscribe(channel: Channel, handler: MsgHandler) {
        if (!channelHandlers.has(channel)) channelHandlers.set(channel, new Set());
        channelHandlers.get(channel)!.add(handler);
        if (!subscribed.has(channel)) {
            subscribed.add(channel);
            send({ event: "subscribe", channel });
        }
        return () => unsubscribe(channel, handler);
    }

    /** @brief function notifying the Realtime server 
     * that client is no longer interested in messages published in a [channel]
     * if [handler] function is not provided ; Or that client wants to remove a handler
     * function from its list of handlers
    *
    *  @param channel the channel name that the client is wishing to get messages from
    *  @param handler? function handler for the event
    */
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

    /** @brief Publishes a message into the channel
    *
    *  @param channel the channel name that the client is wishing to get messages from channel
    *  @param handler function handler for the event
    */
    function publish(channel: Channel, data: PubData, excludeSelf: boolean) {
        send({ event: "publish", channel, data, excludeSelf });
    }

    /** @brief CleanUp of the socket object and other utilities wrapped
     *  inside the closure function, use it when you're done with the websocket connection
    *
    *  @param reason the message to send to the server along with the 1000 code
    * [WebSocket Reference](https://websocket.org/reference/close-codes/)
    */
    function destructor(reason?: string) {
        stopHeartbeat();
        if (ws) ws.close(1000, reason);
        ws = null;
    }

    connect();

    return { onConnection, destructor, subscribe, unsubscribe, publish };
}

export default Realtime
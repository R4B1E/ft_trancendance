module.exports =  function Realtime(serverUrl, options) {
    let ws = null;
    const channelHandlers = new Map();
    const subscribed = new Set();
    let heartbeatTimer = null;
    let reconnectAttempt = 0;
    const reconnectMaxDelayMs = options?.reconnectMaxDelayMs ?? 30_000;

    // ensure single onmessage handler that routes by channel
    function connect() {
        ws = new WebSocket(serverUrl);
        ws.addEventListener("open", () => {
            reconnectAttempt = 0;
            // re-subscribe channels after reconnect
            subscribed.forEach(ch => {
                send({ event: "subscribe", channel: ch });
            });
            startHeartbeat();
        });

        ws.addEventListener("message", (ev) => {
            try {
                const obj = JSON.parse(ev.data);
                const handlers = channelHandlers.get(obj.channel);
                if (handlers) {
                    handlers.forEach(h => {
                        try { h(obj.data, ev); } catch (err) { console.error("handler error", err); }
                    });
                }
            } catch (err) {
                console.error("invalid message", err, ev.data);
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
        const ms = options?.heartbeatIntervalMs ?? 20_000;
        stopHeartbeat();
        heartbeatTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: "ping" }));
        }, ms);
    }
    function stopHeartbeat() { if (heartbeatTimer != null) { clearInterval(heartbeatTimer); heartbeatTimer = null; } }

    function send(obj) {
        if (!ws) throw new Error("Not connected");
        if (ws.readyState !== WebSocket.OPEN) {
            // optionally queue or throw
            console.warn("ws not open; message dropped", obj);
            return;
        }
        ws.send(JSON.stringify(obj));
    }

    function onConnection(cb) {
        if (!ws) connect();
        if (!ws) throw new Error("Failed to create socket");
        ws.addEventListener("open", cb);
    }

    function subscribe(channel , handler) {
        if (!channelHandlers.has(channel)) channelHandlers.set(channel, new Set());
        channelHandlers.get(channel).add(handler);
        if (!subscribed.has(channel)) {
            subscribed.add(channel);
            send({ event: "subscribe", channel });
        }
        // return unsubscribe helper
        return () => unsubscribe(channel, handler);
    }

    function unsubscribe(channel , handler) {
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

    function publish(channel , data, excludeSelf) {
        send({ event: "publish", channel, data , excludeSelf});
    }

    function destructor(reason) {
        stopHeartbeat();
        if (ws) ws.close(1000, reason);
        ws = null;
    }

    // connect immediately
    connect();

    return { onConnection, destructor, subscribe, unsubscribe, publish };
}
// this needs to go somewhere
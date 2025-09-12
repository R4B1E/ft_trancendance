var GameStatus;
(function (GameStatus) {
    GameStatus["PENDING"] = "PENDING";
    GameStatus["ON"] = "ON";
    GameStatus["OFF"] = "OFF";
})(GameStatus || (GameStatus = {}));
function Realtime(serverUrl, options) {
    var _a;
    var ws = null;
    var channelHandlers = new Map();
    var subscribed = new Set();
    var heartbeatTimer = null;
    var reconnectAttempt = 0;
    var reconnectMaxDelayMs = (_a = options === null || options === void 0 ? void 0 : options.reconnectMaxDelayMs) !== null && _a !== void 0 ? _a : 30000;
    // ensure single onmessage handler that routes by channel
    function connect() {
        ws = new WebSocket(serverUrl);
        ws.addEventListener("open", function () {
            reconnectAttempt = 0;
            // re-subscribe channels after reconnect
            subscribed.forEach(function (ch) {
                send({ event: "subscribe", channel: ch });
            });
            startHeartbeat();
        });
        ws.addEventListener("message", function (ev) {
            try {
                var obj_1 = JSON.parse(ev.data);
                var handlers = channelHandlers.get(obj_1.channel);
                obj_1.data = JSON.parse(obj_1.data);
                if (handlers) {
                    handlers.forEach(function (h) {
                        try {
                            h(obj_1.data, ev);
                        }
                        catch (err) {
                            console.error("handler error", err);
                        }
                    });
                }
            }
            catch (err) {
                console.error("invalid message", err, ev.data);
            }
        });
        ws.addEventListener("close", function (e) {
            stopHeartbeat();
            if ((options === null || options === void 0 ? void 0 : options.reconnect) !== false)
                scheduleReconnect();
        });
        ws.addEventListener("error", function (e) {
            console.warn("ws error", e);
        });
    }
    function scheduleReconnect() {
        reconnectAttempt++;
        var delay = Math.min(1000 * Math.pow(1.5, reconnectAttempt), reconnectMaxDelayMs);
        setTimeout(function () {
            connect();
        }, delay);
    }
    function startHeartbeat() {
        var _a;
        var ms = (_a = options === null || options === void 0 ? void 0 : options.heartbeatIntervalMs) !== null && _a !== void 0 ? _a : 20000;
        stopHeartbeat();
        heartbeatTimer = window.setInterval(function () {
            if (ws && ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ event: "ping" }));
        }, ms);
    }
    function stopHeartbeat() { if (heartbeatTimer != null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    } }
    function send(obj) {
        if (!ws)
            throw new Error("Not connected");
        if (ws.readyState !== WebSocket.OPEN) {
            // optionally queue or throw
            console.warn("ws not open; message dropped", obj);
            return;
        }
        ws.send(JSON.stringify(obj));
    }
    function onConnection(cb) {
        if (!ws)
            connect();
        if (!ws)
            throw new Error("Failed to create socket");
        ws.addEventListener("open", cb);
    }
    function subscribe(channel, handler) {
        if (!channelHandlers.has(channel))
            channelHandlers.set(channel, new Set());
        channelHandlers.get(channel).add(handler);
        if (!subscribed.has(channel)) {
            subscribed.add(channel);
            send({ event: "subscribe", channel: channel });
        }
        // return unsubscribe helper
        return function () { return unsubscribe(channel, handler); };
    }
    function unsubscribe(channel, handler) {
        var set = channelHandlers.get(channel);
        if (set && handler) {
            set.delete(handler);
            if (set.size === 0) {
                channelHandlers.delete(channel);
                subscribed.delete(channel);
                send({ event: "unsubscribe", channel: channel });
            }
        }
        else {
            channelHandlers.delete(channel);
            subscribed.delete(channel);
            send({ event: "unsubscribe", channel: channel });
        }
    }
    function publish(channel, data, excludeSelf) {
        send({ event: "publish", channel: channel, data: data, excludeSelf: excludeSelf });
    }
    function destructor(reason) {
        stopHeartbeat();
        if (ws)
            ws.close(1000, reason);
        ws = null;
    }
    // connect immediately
    connect();
    return { onConnection: onConnection, destructor: destructor, subscribe: subscribe, unsubscribe: unsubscribe, publish: publish };
}
export default Realtime;
//# sourceMappingURL=client.js.map
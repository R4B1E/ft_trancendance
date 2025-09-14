function Realtime(serverUrl, options) {
    var _a, _b;
    var ws = null;
    var channelHandlers = new Map();
    var subscribed = new Set();
    var heartbeatTimer = null;
    var reconnectAttempt = 0;
    var lastPongTime = Date.now();
    var heartbeatIntervalMs = (_a = options === null || options === void 0 ? void 0 : options.heartbeatIntervalMs) !== null && _a !== void 0 ? _a : 20000;
    var reconnectMaxDelayMs = (_b = options === null || options === void 0 ? void 0 : options.reconnectMaxDelayMs) !== null && _b !== void 0 ? _b : 30000;
    function connect() {
        ws = new WebSocket(serverUrl);
        ws.addEventListener("open", function () {
            console.log('connection established');
            reconnectAttempt = 0;
            subscribed.forEach(function (ch) {
                send({ event: "subscribe", channel: ch });
            });
            startHeartbeat();
        });
        ws.addEventListener("message", function (ev) {
            if (ev.data === "pong") {
                lastPongTime = Date.now();
            }
            else {
                try {
                    var obj_1 = JSON.parse(ev.data);
                    var handlers = channelHandlers.get(obj_1.channel);
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
        stopHeartbeat();
        heartbeatTimer = setInterval(function () {
            if (ws && ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ event: "ping" }));
            if (Date.now() - lastPongTime > heartbeatIntervalMs)
                if (ws)
                    ws.close();
        }, heartbeatIntervalMs);
    }
    function stopHeartbeat() {
        if (heartbeatTimer != null) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }
    function send(obj) {
        if (!ws)
            throw new Error("Not connected");
        if (ws.readyState !== WebSocket.OPEN) {
            console.warn("ws not open; message dropped", obj);
            return;
        }
        console.log('sending a new message from client !');
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
    connect();
    return { onConnection: onConnection, destructor: destructor, subscribe: subscribe, unsubscribe: unsubscribe, publish: publish };
}
export default Realtime;
/*
class AIPlayer(PongPlayer):
    def calculate_move(self, paddle_pos: PaddlePosition, ball_pos: BallPosition) -> MovePaddle:
        y_middle_paddle = paddle_pos.top + paddle_pos.height / 2
        if ball_pos.y < y_middle_paddle - paddle_pos.height/4:
            return MovePaddle.UP
        if ball_pos.y > y_middle_paddle + paddle_pos.height/4:
            return MovePaddle.DOWN
        return MovePaddle.NONE
class Ball:

    def __init__(self, screen_width: int, screen_height: int):
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.max_angle = 60
        self.x = screen_width / 2
        self.y = screen_height / 2
        self.ball_velocity_module = 10
        self.dx = random.randint(self.ball_velocity_module/2, self.ball_velocity_module)
        self.dy = math.sqrt(self.ball_velocity_module ** 2 - self.dx ** 2)
        self.dv = 0.1
    
    def get_position(self) -> BallPosition:
        return BallPosition(self.x, self.y)

    def is_paddle_colliding(self, paddle_pos: PaddlePosition) -> bool:
        if paddle_pos.top < self.y < paddle_pos.top + paddle_pos.height:
            if paddle_pos.x < self.x < paddle_pos.x + paddle_pos.width:
                return True
        return False

    def update(self, paddle_1_pos: PaddlePosition, paddle_2_pos: PaddlePosition) -> BallPosition:
        self.x += self.dx
        self.y += self.dy
        if self.y < 0 or self.y > self.screen_height:
            self.dy = -self.dy
        if self.is_paddle_colliding(paddle_1_pos):
            self._calculate_paddle_hit(paddle_1_pos)
        if self.is_paddle_colliding(paddle_2_pos):
            self._calculate_paddle_hit(paddle_2_pos)
            self.dx = -self.dx
        return self.get_position()

    def _calculate_paddle_hit(self, paddle_pos: PaddlePosition):
        paddle_middle_point = paddle_pos.top + paddle_pos.height / 2
        relative_position = ((self.y - paddle_middle_point) / (paddle_pos.height / 2))
        relative_angle = relative_position * self.max_angle
        self.ball_velocity_module += self.dv
        self.dx = self.ball_velocity_module * math.cos(math.radians(relative_angle))
        self.dy = self.ball_velocity_module * math.sin(math.radians(relative_angle))

        Ref : https://github.com/diogodanielsoaresferreira/pong/blob/main/game/ball.py
*/ 
//# sourceMappingURL=app.js.map
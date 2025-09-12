var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import Realtime from "./realtime-client/client.js";
var players = {};
var myGameRoomCode = localStorage.getItem("roomCode");
var amIHost = localStorage.getItem("isHost");
var clientId = localStorage.getItem("myid");
console.log("".concat(myGameRoomCode, " ").concat(amIHost, " ").concat(clientId));
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
canvas.width = innerWidth * 0.7;
canvas.height = innerHeight * 0.8;
canvas.style.left = "".concat(innerWidth / 2 - canvas.width / 2, "px");
canvas.style.top = "".concat(innerHeight / 2 - canvas.height / 2, "px");
canvas.style.position = "absolute";
document.body.style.backgroundColor = 'black';
var realtime = Realtime('ws://localhost:8080');
realtime.onConnection(function (event) {
    realtime.publish("StartGame", { PlayerId: clientId, roomMode: "Multiplayer" }, true);
    realtime.subscribe(clientId + "-Matchmaking", function (message) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log('got a new message');
            console.log(message);
            return [2 /*return*/];
        });
    }); });
    console.log(clientId);
    if (amIHost == "true") {
        realtime.subscribe(myGameRoomCode + "thread-ready", function (msg) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                realtime.publish(myGameRoomCode, {
                    isHost: amIHost,
                    clientId: clientId
                }, true);
                return [2 /*return*/];
            });
        }); });
        console.log('sending payload cause i am the host !');
        realtime.publish("PongGame", {
            roomCode: myGameRoomCode,
            isHost: amIHost,
            width: canvas.width,
            height: canvas.height,
            clientId: clientId
        }, true);
    }
    else if (amIHost != "true") {
        realtime.publish(myGameRoomCode, {
            isHost: amIHost,
            clientId: clientId
        }, true);
    }
    realtime.subscribe(myGameRoomCode + "game-state", function (message) {
        players = message.players;
    });
});
window.requestAnimationFrame(update);
function update() {
    ctx.fillStyle = "rgb(255 255 255 / 30%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var player in players) {
        ctx.fillStyle = players[player].color;
        ctx.fillRect(players[player].x, players[player].y, players[player].width, players[player].height);
    }
    window.requestAnimationFrame(update);
}
// Listening on key events, the rest is self explnatory
window.addEventListener("keydown", function (event) {
    if (event.key == "ArrowUp" || event.key == "ArrowDown") {
        realtime.publish(clientId + "pos", {
            keyPressed: event.key
        }, true);
    }
}, false);
//# sourceMappingURL=index.js.map
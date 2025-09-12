import Realtime from "./realtime-client/client";

interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    velocity: number;
    color: string;
}

interface Ball {
    velocity: number;
    radius: number;
    x: number;
    y: number;
    color: string;
}

let players: { [key: string]: Player } = {};
let myGameRoomCode = localStorage.getItem("roomCode");
let amIHost = localStorage.getItem("isHost");
let clientId = localStorage.getItem("myid");

console.log(`${myGameRoomCode} ${amIHost} ${clientId}`)

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
canvas.width = innerWidth * 0.7;
canvas.height = innerHeight * 0.8;
canvas.style.left = `${innerWidth / 2 - canvas.width / 2}px`;
canvas.style.top = `${innerHeight / 2 - canvas.height / 2}px`;
canvas.style.position = "absolute";

document.body.style.backgroundColor = 'black';


let realtime = Realtime('ws://localhost:8080');

realtime.onConnection((event) => {
    realtime.publish("StartGame", {PlayerId : clientId, roomMode : "Multiplayer"}, true);
    realtime.subscribe(clientId + "-Matchmaking", async(message) => 
    {
        console.log('got a new message');
        console.log(message)
    })
    console.log(clientId)
    if (amIHost == "true") {
        realtime.subscribe(myGameRoomCode + "thread-ready", async (msg) => {
            realtime.publish(myGameRoomCode!, {
                isHost: amIHost,
                clientId: clientId
            }, true)
        })
        console.log('sending payload cause i am the host !')
        realtime.publish("PongGame", {
            roomCode: myGameRoomCode,
            isHost: amIHost,
            width: canvas.width,
            height: canvas.height,
            clientId: clientId
        }, true)
    }
    else if (amIHost != "true") {
        realtime.publish(myGameRoomCode!, {
            isHost: amIHost,
            clientId: clientId
        }, true)
    }
    realtime.subscribe(myGameRoomCode + "game-state", (message) => {
        players = message.players
    })
})

window.requestAnimationFrame(update);

function update() {
    ctx.fillStyle = "rgb(255 255 255 / 30%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let player in players) {
        ctx.fillStyle = players[player].color;
        ctx.fillRect(players[player].x, players[player].y, players[player].width, players[player].height)
    }
    window.requestAnimationFrame(update);
}

// Listening on key events, the rest is self explnatory
window.addEventListener("keydown", (event) => {
    if (event.key == "ArrowUp" || event.key == "ArrowDown") {
        realtime.publish(clientId + "pos", {
            keyPressed: event.key
        }, true)
    }
}, false
);
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require('node:worker_threads');

const Realtime = require('../Realtime/app.js')

const CANVAS_HEIGHT = workerData ? workerData.canvas_height : 0;
const CANVAS_WIDTH = workerData ? workerData.canvas_width : 0;
const GAME_TICKER_MS = 1_000 / 60 ;

const merge = Math.floor(CANVAS_HEIGHT * 0.005);
const player_width = Math.floor(CANVAS_WIDTH * 0.009);
const player_height = Math.floor(CANVAS_HEIGHT * 0.15);
const player_x = Math.floor(CANVAS_WIDTH - merge - player_width);
const player_y = Math.floor(CANVAS_HEIGHT / 2 - player_height / 2);

let players = {};
let playerChannels = {};
let gameOn = false;
let roomCode = workerData ? workerData.hostRoomCode : 0;
// let gameRoom;
let gameTickerOn = true;

const realtime = Realtime("ws://localhost:8080");

function startGameDataTicker() {
    let tickInterval = setInterval(async () => {
        if (!gameTickerOn)
            clearInterval(tickInterval)
        else {
            // console.log(`sent a new message ${JSON.stringify(players)}`)
            realtime.publish(roomCode + "game-state", {
                players,
                gameOn
            }, true)
        }
    }, GAME_TICKER_MS)
}

function subscribeToPlayerInput(channelInstance, playerId) {
    realtime.subscribe(channelInstance, async (msg) => {
        const input = JSON.parse(msg)
        if (input.keyPressed == "ArrowUp") {
            if (players[playerId].y - players[playerId].velocity < 0)
                players[playerId].y = 0;
            else
                players[playerId].y -= players[playerId].velocity
        }
        else if (input.keyPressed == "ArrowDown") {
            if (players[playerId].y + players[playerId].velocity > CANVAS_HEIGHT - players[playerId].height)
                players[playerId].y = CANVAS_HEIGHT - players[playerId].height;
            else
                players[playerId].y += players[playerId].velocity;
        }
    })
}

realtime.onConnection(async (player) => {
    let newPlayerId;
    realtime.subscribe(roomCode, async (player) => {
        // parentPort.postMessage({
        //     roomName: workerData.hostRoomCode,
        //     gameOn: gameOn,
        // })
        parentPort.postMessage(
            {
                roomName: roomCode,
                gameOn: gameOn
            }
        )
        player = JSON.parse(player)
        newPlayerId = player.clientId;
        if (!players[newPlayerId])
        {
            playerChannels[newPlayerId] = newPlayerId + "pos";
            let newPlayerObject = {
                id: newPlayerId,
                x: Object.keys(players).length === 0 ? merge : player_x,
                y: player_y,
                score: 0,
                velocity: Math.floor(player_height * 0.1),
                color: Object.keys(players).length === 0 ? "red" : "blue",
                width: player_width,
                height: player_height
            };
            players[newPlayerId] = newPlayerObject;
            startGameDataTicker();
            // console.log(players);
            subscribeToPlayerInput(playerChannels[newPlayerId], newPlayerId);
        }
    })
    realtime.publish(roomCode + "thread-ready", {
        start: true,
    });
})

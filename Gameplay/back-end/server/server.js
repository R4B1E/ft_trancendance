'use strict'

const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
  threadId,
  MessageChannel,
} = require("worker_threads");

const Realtime = require('../Realtime/app.js')

function generateNewGameThread(
  isHost ,
  hostRoomCode ,
  hostClientId ,
  canvas_width ,
  canvas_height ,
  activeGameRooms
) {
  if (isMainThread) {
    const worker = new Worker("./server/server-worker.js", {
      workerData: {
        hostRoomCode: hostRoomCode,
        hostClientId: hostClientId,
        canvas_width: canvas_width,
        canvas_height: canvas_height
      },
    });
    console.log(`CREATING NEW THREAD WITH ID ${threadId}`);
    worker.on("error", (error) => {
      console.log(`WORKER EXITED DUE TO AN ERROR ${error}`);
    });
    worker.on("message", (msg) => {
      if (msg.roomName && !msg.resetEntry) {
        activeGameRooms[msg.roomName] = {
          roomName: msg.roomName,
          gameOn: msg.gameOn,
        };
      } else if (msg.roomName && msg.resetEntry) {
        delete activeGameRooms[msg.roomName];
      }
    });
    worker.on("exit", (code) => {
      console.log(`WORKER EXITED WITH THREAD ID ${threadId}`);
      if (code !== 0) {
        console.log(`WORKER EXITED DUE TO AN ERROR WITH CODE ${code}`);
      }
    });
  }
}


module.exports = async function (fastify, opts) {
  let activeGameRooms = {};
  let realtime = Realtime('ws://localhost:8080');
  realtime.onConnection((event) => 
  {
    realtime.subscribe('PongGame', (message) => 
    {
      const data = JSON.parse(message);
      if (activeGameRooms[data.roomCode] === undefined)
        generateNewGameThread(
          data.isHost,
          data.roomCode,
          data.clientId,
          data.width,
          data.height,
          activeGameRooms
        );
    })
  })
}

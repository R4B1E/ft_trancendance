'use strict'

function getRandomRoomId() {
    return Number(Math.random().toString().substring(2, 8));
}

const Realtime = require('../Realtime/app')

const Modes = new Map([["Tournament", 8], ["Multiplayer", 2]]);

async function findRoom(id, PrismaClient) {
    const Room = await PrismaClient.Game.findUnique({
        where: {
            id: id
        },
    })
    if (Room === null)
        throw new Error("Room does not exist (:")
    return Room;
}

async function CreateGame(players, PrismaClient, Mode) {
    const rooms = [];
    try {
        const game = await PrismaClient.game.create({
            data: {
                type: Mode,
            }
        })
        for (let i = 0; i < players.length; i += 2) {
            const room = await PrismaClient.room.create({
                data: {
                    gameId: game.id,
                    players: {
                        create: [
                            { id: players[i] },
                            { id: players[i + 1] },
                        ],
                    },
                },
                include: {
                    players: true
                }
            });
            rooms.push(room)
        }
        return rooms
    } catch (error) {
        console.log('got here because of error !')
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // The .code property can be accessed in a type-safe manner => Ref : https://www.prisma.io/docs/orm/reference/error-reference
            if (error.code === 'P2002') {
                console.log(
                    'There is a unique constraint violation, a new user cannot be created with this email'
                )
            }
        }
    }
}

async function updateRoom(gameId, PrismaClient, newPlayerId) {
    const result = await PrismaClient.$transaction(async (tx) => {
        const latestRoom = await tx.room.findFirst({
            where: { gameId },
            orderBy: { createdAt: 'desc' }
        });

        if (!latestRoom) {
            throw new Error('No rooms found for that game :(');
        }

        const updatedRoom = await tx.room.update({
            where: { id: latestRoom.id },
            data: {
                players: { create: { id: newPlayerId } }
            },
            include: { players: true }
        });
        return updatedRoom;
    });
}

function SendError(message, realtime, channel) {
    realtime.publish(channel, { message });
}

module.exports = async function (fastify, opts) {
    let realtime = Realtime('ws://localhost:8080');

    let Queue = new Map();

    realtime.onConnection((event) => {
        // realtime.subscribe('JoinGame', async (message) => {
        //     const { roomCode, PlayerId } = JSON.parse(message);
        //     try {
        //         const GameEntity = await findRoom(roomCode, fastify.prisma);
        //         if (GameEntity.TotalPlayers + 1 > GameEntity.MaxPlayers)
        //             throw "Game Room Full (:"
        //         updateRoom(roomCode, fastify.prisma, PlayerId);
        //     } catch (error) {
        //         return SendError("Error: " + error.message, realtime, PlayerId + "-Matchmaking");
        //     }
        // });


        // TO.DO : change message and CreateGame logic
        // Room / Lobby / Game
        // Each Game has one 1 or more Game Rooms, furthermore , each Game Room have 2 lobby room
        // each lobby room can contain one or more players

        realtime.subscribe('StartGame', async (message) => {
            const { roomMode, PlayerId } = JSON.parse(message);
            if (!Queue.has(roomMode))
                Queue.set(roomMode, [])
            Queue.get(roomMode).push(Number(PlayerId));
            if (Queue.get(roomMode).length === Modes.get(roomMode)) {
                const rooms = await CreateGame(Queue.get(roomMode), fastify.prisma, roomMode);
                console.log(rooms)
                for (const room of rooms) {
                    console.log('room', room.id);

                    if (!Array.isArray(room.players)) {
                        console.warn('room has no players:', room);
                        continue;
                    }

                    for (const player of room.players) {
                        console.log('got here in loop players');
                        realtime.publish(`${player.id}-Matchmaking`, { id: room.id }, true);
                        console.log(`sending room id to ${player.id}-Matchmaking`);
                    }
                }
                Queue.get(roomMode).splice(0, Modes[roomMode]);
            }
        });

        // realtime.subscribe('CreateGame', async (message) => {
        // const {GameMode, PlayerId} = JSON.parse(message);
        // const GameId = await CreateGame(PlayerId, fastify.prisma, GameMode)
        // realtime.publish(PlayerId + "-Matchmaking", {GameId}, true);
        // });

    })
}
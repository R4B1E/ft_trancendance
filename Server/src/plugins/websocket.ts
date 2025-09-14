// import { FastifyInstance, FastifyPluginAsync } from 'fastify';
// import fastifyWebsocket from '@fastify/websocket'

// // Ref : https://github.com/fastify/fastify-websocket
// const WebsocketPlugin: FastifyPluginAsync = async function (fastify: FastifyInstance) {
//     fastify.register(fastifyWebsocket, {
//         errorHandler: function (error, socket, req, reply) {
//             socket.terminate()
//         },
//         options: {
//             maxPayload: 1048576,
//             // JWT verification can go here
//             // verifyClient: function (info, next) {
//             //     if (info.req.headers['x-fastify-header'] !== 'fastify is awesome !') {
//             //         return next(false) // the connection is not allowed
//             //     }
//             //     next(true) // the connection is allowed
//             // }
//         },
//         preClose: (done) => { // Note: can also use async style, without done-callback
//             const server = fastify.websocketServer

//             for (const socket of server.clients) {
//                 socket.close(1001, 'WS server is going offline in custom manner, sending a code + message')
//             }

//             server.close(done)

//             server.on('close', () => {
//                 console.log('connection closed');
//             })
//         }
//     })
// }

// export default WebsocketPlugin
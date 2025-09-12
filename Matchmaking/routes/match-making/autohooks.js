// 'use strict'

// const schemas = require('./schemas/loader')

// module.exports = async function (fastify, opts) {
//   // fastify.addHook('onRequest', fastify.auth);
//   const ActiveRooms = fastify.mongo.db.collection('ActiveRooms')
//   fastify.decorate('ActiveRooms', ActiveRooms) // this is a temporarily fix
//   fastify.register(schemas)
//   let tournamentQueue = [];
//   let multiplayerQueue = [];
//   fastify.decorate(tournamentQueue, tournamentQueue);
//   fastify.decorate(multiplayerQueue, multiplayerQueue);
// }

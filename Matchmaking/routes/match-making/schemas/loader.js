'use strict'
const fp = require('fastify-plugin')
module.exports = fp(async function schemaLoaderPlugin(fastify, opts) {
    fastify.addSchema(require('./create-body.json'))
    fastify.addSchema(require('./create-response.json'))
    fastify.addSchema(require('./status-params.json'))
    fastify.addSchema(require('./room.json'))
    fastify.addSchema(require('./read-params.json'))
    fastify.addSchema(require('./update-params.json'))
    fastify.decorate('findRoom', require('../utils/findRoom'))
    fastify.decorate('Queue', new Array())
})
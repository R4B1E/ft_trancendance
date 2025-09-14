import fp from 'fastify-plugin'

import cors from '@fastify/cors'

import { FastifyPluginAsync, FastifyInstance } from 'fastify'

const CrossOriginPlugin : FastifyPluginAsync = fp(async function (fastify : FastifyInstance, opts) {
  fastify.register(cors, {
    origin: true
  })
})

export default CrossOriginPlugin
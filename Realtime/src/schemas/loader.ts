import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify';

const PluginEnv : FastifyPluginAsync = fp(async function (fastify, opts) {
  fastify.addSchema(require('./dotenv.json'))
})

export default PluginEnv
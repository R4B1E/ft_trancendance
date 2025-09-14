// https://github.com/fastify/fastify-env

declare module 'fastify' {
  interface FastifyInstance {
    config: { // this should be the same as the confKey in options
      // specify your typing here
      PORT: number,
      NODE_ENV: string
    };
  }
}

import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'
import { FastifyPluginAsync, FastifyInstance } from 'fastify'

const fastifyEnvPlugin: FastifyPluginAsync = fp(async function (fastify: FastifyInstance, opts) {
  const options = {
    // confKey: 'secrets',
    schema: fastify.getSchema('schema:dotenv'),
    dotenv: {
      path: `${__dirname}/../../.env`,
      debug: true
    }
  }
  await fastify.register(fastifyEnv as FastifyPluginAsync, options)
})

export default fastifyEnvPlugin

'use strict'

import { join } from 'node:path'
import Fastify from 'fastify'
import AutoLoad from '@fastify/autoload'

const fastify = Fastify({
  logger: true,
  ajv: {
    customOptions: {
      removeAdditional: 'all'
    }
  }, 
})

void fastify.register(AutoLoad, {
  dir: join(__dirname, 'plugins')
})

void fastify.register(AutoLoad, {
  dir: join(__dirname, 'routes')
})

void fastify.register(AutoLoad, {
  dir: join(__dirname, 'server')
})

fastify
  .listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3000 })
  .catch((err) => {
    fastify.log.error(err)
    process.exit(1)
  })
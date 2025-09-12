'use strict'

const path = require('node:path')
const AutoLoad = require('@fastify/autoload')

module.exports = async function(fastify, opts)
{
    fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'schemas'),
    indexPattern: /^loader.js$/i
  })

  await fastify.register(require('./configs/config'))
  fastify.log.info('Config loaded %o', fastify.config)

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins')
  })
  
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'server'),
    indexPattern: /^server.js$/i
  })
}

module.exports.options = {
  ajv: {
    customOptions: {
      removeAdditional: 'all'
    }
  },
  logger: {
    level: 'info'
  }
}
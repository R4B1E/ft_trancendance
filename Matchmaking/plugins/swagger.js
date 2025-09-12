const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
  fastify.register(require('@fastify/swagger'), {
    routePrefix: '/docs',
    exposeRoute: opts.env !== 'production',
    swagger: {
      info: {
        title: 'Fastify app',
        description: 'Fastify Book examples',
        version: require('../package.json').version
      }
    }
  })
}
)

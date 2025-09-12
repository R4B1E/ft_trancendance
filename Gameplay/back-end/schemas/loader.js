const fp = require('fastify-plugin')

module.exports = fp( async function (fastify, opts) {
  fastify.addSchema(require('./dotenv.json'))
})

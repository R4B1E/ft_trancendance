const fp = require('fastify-plugin')
const fastifyEnv = require('@fastify/env')
module.exports = fp(async function (fastify, opts) {
  await fastify.register(fastifyEnv, {
    confKey: 'secrets',
    schema: fastify.getSchema('schema:dotenv')
  })
  // const Ably = require('ably')
  // const realtime = new Ably.Realtime({
  //   key: fastify.secrets.ABLY_KEY,
  //   echoMessages: false
  // })
  // fastify.decorate('config', {
  //   mongo: {
  //     forceClose: true,
  //     url: fastify.secrets.MONGO_URL
  //   },
  //   env: fastify.secrets.NODE_ENV
  //   // ably: realtime
  // })
})

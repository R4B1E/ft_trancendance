import { join } from 'node:path'
import Fastify from 'fastify'
import AutoLoad from '@fastify/autoload'
import fastifyWebsocket from '@fastify/websocket'

async function main() {

  const fastify = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all'
      }
    },
  })

  fastify.register(AutoLoad, {
    dir: join(__dirname, 'schemas'),
    indexPattern: /^loader.js$/i
  })

  await fastify.register(require('./configs/config'))
  fastify.log.info('Config loaded %o', fastify.config)

  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins')
  })

  await fastify.register(fastifyWebsocket, {
          errorHandler: function (error, socket, req, reply) {
              socket.terminate()
          },
          options: {
              maxPayload: 1048576,
              // JWT verification can go here
              // verifyClient: function (info, next) {
              //     if (info.req.headers['x-fastify-header'] !== 'fastify is awesome !') {
              //         return next(false) // the connection is not allowed
              //     }
              //     next(true) // the connection is allowed
              // }
          },
          preClose: (done) => { // Note: can also use async style, without done-callback
              const server = fastify.websocketServer
  
              for (const socket of server.clients) {
                  socket.close(1001, 'WS server is going offline in custom manner, sending a code + message')
              }
  
              server.close(done)
  
              server.on('close', () => {
                  console.log('connection closed');
              })
          }
      })

  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes')
  })

  fastify.ready().then(() => {
    fastify
      .listen({ host: '0.0.0.0', port: fastify.config.PORT || 3000 })
      .catch((err) => {
        fastify.log.error(err)
        process.exit(1)
      })
  })

  process.once('SIGINT', async function closeApplication() {
    const tenSeconds = 6000
    const timeout = setTimeout(function forceClose() {
      fastify.log.error('force closing server')
      process.exit(1)
    }, tenSeconds)
    timeout.unref()
    try {
      await fastify.close()
      fastify.log.info('bye bye')
    } catch (err) {
      fastify.log.error(err, 'the app had trouble turning off')
    }
  })
}

main();
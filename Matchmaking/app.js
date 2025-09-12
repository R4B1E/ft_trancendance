'use strict'

const path = require('node:path')
const AutoLoad = require('@fastify/autoload')

module.exports = async function (fastify, opts) {
  // Place here your custom code!

  // Do not touch the following lines
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'schemas'),
    indexPattern: /^loader.js$/i
  })

  await fastify.register(require('./configs/config'))
  fastify.log.info('Config loaded %o', fastify.config)

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  await fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    ignorePattern: /.*.no-load\.js/,
    indexPattern: /^no$/i
  })

  // at app startup (once)
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION — process would exit. Stack:\n', err.stack || err);
    // don't swallow in production — this is just for debugging
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION — promise:', promise, '\nreason:', reason && reason.stack ? reason.stack : reason);
  });

  // Wrap prisma.$disconnect to get a trace when someone calls it
  if (fastify && fastify.prisma) {
    const originalDisconnect = fastify.prisma.$disconnect.bind(fastify.prisma);
    fastify.prisma.$disconnect = async (...args) => {
      console.trace('prisma.$disconnect called! stack:');
      return originalDisconnect(...args);
    };

    fastify.prisma.$on('query', (e) => console.log('prisma query:', e.query));
    fastify.prisma.$on('error', (e) => console.error('prisma error event:', e));
    fastify.prisma.$on('warn', (e) => console.warn('prisma warn:', e));
  }

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'Server'),
    indexPattern: /^app.js$/i
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

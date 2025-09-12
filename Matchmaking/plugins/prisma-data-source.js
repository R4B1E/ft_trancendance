'use strict'

const fp = require('fastify-plugin');
const { PrismaClient } = require('../generated/prisma');

module.exports = fp(
    async function (fastify, opts) {
        const prisma = new PrismaClient();

        try {
            await prisma.$connect();
            fastify.log && fastify.log.info('Prisma connected');
        } catch (err) {
            fastify.log && fastify.log.error('Prisma connection error', err);
            throw err;
        }

        prisma.$on('query', (e) => console.log('prisma query:', e));
        prisma.$on('error', (e) => console.error('prisma error:', e));
        prisma.$on('warn', (e) => console.warn('prisma warn:', e));


        fastify.decorate('prisma', prisma);

        // fastify.addHook('onClose', async (instance, done) => {
        //     try {
        //         await prisma.$disconnect();
        //         fastify.log && fastify.log.info('Prisma disconnected');
        //         done();
        //     } catch (err) {
        //         fastify.log && fastify.log.error('Error disconnecting Prisma', err);
        //         done(err);
        //     }
        // });
    }
);
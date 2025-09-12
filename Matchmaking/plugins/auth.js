'use strict'

const fp = require('fastify-plugin')
const fastifyJwt = require('@fastify/jwt')

module.exports = fp(async function authPlugin(fastify, opts) {
    const revokedTokens = new Map()

    fastify.register(fastifyJwt, {
        secret: fastify.secrets.JWT_SECRET_KEY,
        trusted: function isTrusted(request, decodeToken) {
            !revokedTokens.has(decodeToken.jti)
        }
    })

    fastify.decorate('auth', async function
        auth(request, reply) {
        try {
            await request.jwtVerify()
        } catch (err) {
            reply.send(err)
        }
    })

    fastify.decorateRequest('revokeToken', function () {

        revokedTokens.set(this.user.jti, true)
    })
})
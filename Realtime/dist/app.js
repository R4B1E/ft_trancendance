'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const fastify_1 = __importDefault(require("fastify"));
const autoload_1 = __importDefault(require("@fastify/autoload"));
const fastify = (0, fastify_1.default)({ logger: true });
void fastify.register(autoload_1.default, {
    dir: (0, node_path_1.join)(__dirname, 'plugins')
});
void fastify.register(autoload_1.default, {
    dir: (0, node_path_1.join)(__dirname, 'routes')
});
void fastify.register(autoload_1.default, {
    dir: (0, node_path_1.join)(__dirname, 'server')
});
fastify
    .listen({ host: '0.0.0.0', port: Number(process.env.PORT) || 3000 })
    .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
});
//# sourceMappingURL=app.js.map
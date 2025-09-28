const fp = require('fastify-plugin');
const fastifyCookie = require('@fastify/cookie');
const fastifyJwt = require('@fastify/jwt');

const MIN_SECRET_LENGTH = 16;

function ensureStrongSecret(secret) {
    if (typeof secret !== 'string' || secret.trim().length === 0) {
        throw new Error('JWT_SECRET environment variable must be defined.');
    }

    if (secret.length < MIN_SECRET_LENGTH) {
        throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`);
    }

    const hasUppercase = /[A-Z]/.test(secret);
    const hasLowercase = /[a-z]/.test(secret);
    const hasDigit = /\d/.test(secret);
    const hasSymbol = /[^A-Za-z0-9]/.test(secret);

    if (!hasUppercase || !hasLowercase || !hasDigit || !hasSymbol) {
        throw new Error('JWT_SECRET must include uppercase, lowercase, numeric, and special characters.');
    }
}

function parseCookieMaxAge(value) {
    if (typeof value === 'undefined' || value === null || value === '') {
        return 60 * 60;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('JWT_COOKIE_MAX_AGE must be a positive number representing seconds.');
    }

    return Math.floor(parsed);
}

const authPlugin = async function (fastify) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    const cookieName = process.env.JWT_COOKIE_NAME || 'token';
    const cookieMaxAge = parseCookieMaxAge(process.env.JWT_COOKIE_MAX_AGE);

    ensureStrongSecret(secret);

    fastify.register(fastifyCookie);
    fastify.register(fastifyJwt, {
        secret,
        sign: {
            expiresIn,
        },
        cookie: {
            cookieName,
            signed: false,
        },
    });

    fastify.decorate('jwtConfig', Object.freeze({
        expiresIn,
        cookieName,
        cookieMaxAge,
    }));

    fastify.decorate('authenticate', async function (request, reply) {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.code(401).send({ error: 'unauthorized' });
        }
    });
};

module.exports = fp(authPlugin);

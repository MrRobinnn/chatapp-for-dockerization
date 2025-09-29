const test = require('node:test');
const assert = require('node:assert/strict');

const {loadRoomMessage} = require('../src/services/chatService');

const buildFastifyMock = () => {
    return {
        couchbase: {
            bucket: {name: 'bucket'},
            scope: {name: 'scope'},
            messagesCollection: {name: 'collection'},
            cluster: {
                query: async (statement, options) => {
                    return {statement, options, rows: []};
                }
            }
        },
        httpErrors: {
            badRequest: (message) => {
                const error = new Error(message);
                error.statusCode = 400;
                return error;
            },
            internalServerError: (message) => {
                const error = new Error(message);
                error.statusCode = 500;
                return error;
            }
        },
        log: {
            error: () => {}
        }
    };
};

test('loadRoomMessage sends special characters via parameters', async (t) => {
    const fastify = buildFastifyMock();
    let capturedQuery;
    fastify.couchbase.cluster.query = async (statement, options) => {
        capturedQuery = {statement, options};
        return {rows: []};
    };

    const roomId = 'room::"special`room\'';
    await loadRoomMessage(fastify, roomId, 25);

    assert.ok(capturedQuery.statement.includes('WHERE room = $room'));
    assert.ok(capturedQuery.statement.includes('LIMIT $limit'));
    assert.deepStrictEqual(capturedQuery.options.parameters, {room: roomId, limit: 25});
});

test('loadRoomMessage parses numeric string limits', async () => {
    const fastify = buildFastifyMock();
    let capturedQuery;
    fastify.couchbase.cluster.query = async (statement, options) => {
        capturedQuery = {statement, options};
        return {rows: []};
    };

    await loadRoomMessage(fastify, 'room::123', '15');

    assert.deepStrictEqual(capturedQuery.options.parameters, {room: 'room::123', limit: 15});
});

test('loadRoomMessage rejects non-string room identifiers', async (t) => {
    const fastify = buildFastifyMock();

    await assert.rejects(
        () => loadRoomMessage(fastify, null),
        (err) => err instanceof Error && err.statusCode === 400
    );
});


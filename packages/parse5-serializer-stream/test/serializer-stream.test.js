'use strict';

const { Writable } = require('stream');
const SerializerStream = require('../lib');
const generateSeriliazerTests = require('../../../test/utils/generate-serializer-tests');

generateSeriliazerTests(exports, 'SeriliazerStream', (document, opts) => {
    const stream = new SerializerStream(document, opts);
    const writable = new Writable();
    let result = '';

    //NOTE: use pipe to the WritableStream to test stream
    //in the `flowing` mode.
    writable._write = (chunk, encoding, callback) => {
        result += chunk.toString();
        callback();
    };

    stream.pipe(writable);

    return new Promise(resolve => {
        writable.once('finish', () => resolve(result));
    });
});

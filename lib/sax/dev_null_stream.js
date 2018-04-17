'use strict';

const WritableStream = require('stream').Writable;

class DevNullStream extends WritableStream {
    _write(chunk, encoding, cb) {
        cb();
    }
}

module.exports = DevNullStream;

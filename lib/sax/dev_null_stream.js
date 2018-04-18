'use strict';

const { Writable } = require('stream');

class DevNullStream extends Writable {
    _write(chunk, encoding, cb) {
        cb();
    }
}

module.exports = DevNullStream;

import { Writable } from 'node:stream';

export class DevNullStream extends Writable {
    _write(chunk, encoding, cb) {
        cb();
    }
}

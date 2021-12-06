import { Writable } from 'node:stream';

export class DevNullStream extends Writable {
    override _write(_chunk: string, _encoding: string, cb: () => void): void {
        cb();
    }
}

import { Readable } from 'stream';
import { Serializer } from 'parse5/lib/serializer/index.js';

export class SerializerStream extends Readable {
    constructor(node, options) {
        super({ encoding: 'utf8' });

        this.serializer = new Serializer(node, options);

        Object.defineProperty(this.serializer, 'html', {
            //NOTE: To make `+=` concat operator work properly we define
            //getter which always returns empty string
            get: function () {
                return '';
            },
            set: this.push.bind(this),
        });
    }

    //Readable stream implementation
    _read() {
        this.serializer.serialize();
        this.push(null);
    }
}

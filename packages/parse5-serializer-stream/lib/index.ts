import { Readable } from 'node:stream';
import { Serializer, SerializerOptions } from 'parse5/lib/serializer/index.js';

type Node = any;

export class SerializerStream extends Readable {
    private serializer: Serializer;

    constructor(node: Node, options: SerializerOptions) {
        super({ encoding: 'utf8' });

        this.serializer = new Serializer(node, options);

        Object.defineProperty(this.serializer, 'html', {
            //NOTE: To make `+=` concat operator work properly we define
            //getter which always returns empty string
            get() {
                return '';
            },
            set: this.push.bind(this),
        });
    }

    //Readable stream implementation
    override _read() {
        this.serializer.serialize();
        this.push(null);
    }
}

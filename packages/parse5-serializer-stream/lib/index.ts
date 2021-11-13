import { Readable } from 'node:stream';
import { Serializer, SerializerOptions } from 'parse5/lib/serializer/index.js';
import type { TreeAdapterTypeMap } from 'parse5/lib/tree-adapters/interface';

export class SerializerStream<T extends TreeAdapterTypeMap> extends Readable {
    private serializer: Serializer<T>;

    constructor(node: T['parentNode'], options: SerializerOptions<T>) {
        super({ encoding: 'utf8' });

        this.serializer = new Serializer(node, options);

        Object.defineProperty(this.serializer, 'html', {
            //NOTE: To make `+=` concat operator work properly we define
            //getter which always returns empty string
            get() {
                return '';
            },
            set: (data: string) => this.push(data),
        });
    }

    //Readable stream implementation
    override _read() {
        this.serializer.serialize();
        this.push(null);
    }
}

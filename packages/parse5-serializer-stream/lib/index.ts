import { Readable } from 'node:stream';
import { serialize, type SerializerOptions } from 'parse5/dist/serializer/index.js';
import type { TreeAdapterTypeMap } from 'parse5/dist/tree-adapters/interface.js';

/**
 * Streaming AST node to an HTML serializer. A [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable).
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 * const SerializerStream = require('parse5-serializer-stream');
 * const fs = require('fs');
 *
 * const file = fs.createWriteStream('/home/index.html');
 *
 * // Serializes the parsed document to HTML and writes it to the file.
 * const document = parse5.parse('<body>Who is John Galt?</body>');
 * const serializer = new SerializerStream(document);
 *
 * serializer.pipe(file);
 * ```
 */
export class SerializerStream<T extends TreeAdapterTypeMap> extends Readable {
    /**
     * Streaming AST node to an HTML serializer. A readable stream.
     *
     * @param node Node to serialize.
     * @param options Serialization options.
     */
    constructor(private node: T['parentNode'], private options: SerializerOptions<T>) {
        super({ encoding: 'utf8' });
    }

    //Readable stream implementation
    override _read(): void {
        this.push(serialize(this.node, this.options));
        this.push(null);
    }
}

import type { ParserOptions } from 'parse5/lib/parser/index.js';
import { ParserStream } from '@parse5/parser-stream/lib/index.js';
import { TAG_NAMES as $ } from 'parse5/lib/common/html.js';
import type { TreeAdapterTypeMap } from 'parse5/lib/tree-adapters/interface';

/**
 * Converts plain text files into HTML document as required by [HTML specification](https://html.spec.whatwg.org/#read-text).
 * A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).
 *
 * @example
 *
 * ```js
 * const PlainTextConversionStream = require('@parse5/plain-text-conversion-stream');
 * const fs = require('fs');
 *
 * const file = fs.createReadStream('war_and_peace.txt');
 * const converter = new PlainTextConversionStream();
 *
 * converter.once('finish', () => {
 *     console.log(converter.document.childNodes[1].childNodes[0].tagName); //> 'head'
 * });
 *
 * file.pipe(converter);
 * ```
 */
export class PlainTextConversionStream<T extends TreeAdapterTypeMap> extends ParserStream<T> {
    constructor(options?: ParserOptions<T>) {
        super(options);

        // NOTE: see https://html.spec.whatwg.org/#read-text
        this.parser._insertFakeElement($.HTML);
        this.parser._insertFakeElement($.HEAD);
        this.parser.openElements.pop();
        this.parser._insertFakeElement($.BODY);
        this.parser._insertFakeElement($.PRE);
        this.parser.treeAdapter.insertText(this.parser.openElements.current, '\n');
        this.parser.switchToPlaintextParsing();
    }
}

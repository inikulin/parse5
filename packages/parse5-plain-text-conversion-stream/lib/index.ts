import { type ParserOptions, type TreeAdapterTypeMap, html } from 'parse5';
import { ParserStream } from 'parse5-parser-stream';

const { TAG_ID: $, TAG_NAMES: TN } = html;

/**
 * Converts plain text files into HTML document as required by [HTML specification](https://html.spec.whatwg.org/#read-text).
 * A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).
 *
 * @example
 *
 * ```js
 * const PlainTextConversionStream = require('parse5-plain-text-conversion-stream');
 * const fs = require('fs');
 * const { finished } = require('node:stream');
 *
 * const file = fs.createReadStream('war_and_peace.txt');
 * const converter = new PlainTextConversionStream();
 *
 * finished(converter, () => {
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
        this.parser._insertFakeElement(TN.HTML, $.HTML);
        this.parser._insertFakeElement(TN.HEAD, $.HEAD);
        this.parser.openElements.pop();
        this.parser._insertFakeElement(TN.BODY, $.BODY);
        this.parser._insertFakeElement(TN.PRE, $.PRE);
        this.parser.treeAdapter.insertText(this.parser.openElements.current, '\n');
        this.parser.switchToPlaintextParsing();
    }
}

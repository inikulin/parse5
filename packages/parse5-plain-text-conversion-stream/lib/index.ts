import { ParserStream } from 'parse5-parser-stream/lib/index.js';
import { TAG_NAMES as $ } from 'parse5/lib/common/html.js';
import type { TreeAdapterTypeMap } from 'parse5/lib/tree-adapters/interface';

export class PlainTextConversionStream<T extends TreeAdapterTypeMap> extends ParserStream<T> {
    constructor(options?: any) {
        super(options);

        // NOTE: see https://html.spec.whatwg.org/#read-text
        this.parser._insertFakeElement($.HTML);
        this.parser._insertFakeElement($.HEAD);
        this.parser.openElements!.pop();
        this.parser._insertFakeElement($.BODY);
        this.parser._insertFakeElement($.PRE);
        this.parser.treeAdapter.insertText(this.parser.openElements!.current, '\n');
        this.parser.switchToPlaintextParsing();
    }
}

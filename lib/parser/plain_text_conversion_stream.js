'use strict';

const ParserStream = require('./parser_stream');
const $ = require('../common/html').TAG_NAMES;

class PlainTextConversionStream extends ParserStream {
    constructor(options) {
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

module.exports = PlainTextConversionStream;

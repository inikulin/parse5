'use strict';

const assert = require('assert');
const SAXParser = require('../lib');
const loadSAXParserTestData = require('../../../test/utils/load-sax-parser-test-data');
const { writeChunkedToStream } = require('../../../test/utils/common');

exports['Location info (SAX)'] = function() {
    loadSAXParserTestData().forEach(test => {
        //NOTE: we've already tested the correctness of the location info with the Tokenizer tests.
        //So here we just check that SAXParser provides this info in the handlers.
        const parser = new SAXParser({ sourceCodeLocationInfo: true });

        const handler = ({ sourceCodeLocation }) => {
            assert.strictEqual(typeof sourceCodeLocation.startLine, 'number');
            assert.strictEqual(typeof sourceCodeLocation.startCol, 'number');
            assert.strictEqual(typeof sourceCodeLocation.startOffset, 'number');
            assert.strictEqual(typeof sourceCodeLocation.endOffset, 'number');
            assert.ok(sourceCodeLocation.startOffset < sourceCodeLocation.endOffset);
        };

        parser.on('startTag', handler);
        parser.on('endTag', handler);
        parser.on('doctype', handler);
        parser.on('comment', handler);
        parser.on('text', handler);

        writeChunkedToStream(test.src, parser);
    });
};

exports['Regression - location info for text (GH-153, GH-266)'] = function() {
    const html = '<!DOCTYPE html><html><head><title>Here is a title</title></html>';
    const parser = new SAXParser({ sourceCodeLocationInfo: true });

    parser.on('text', ({ sourceCodeLocation }) => {
        assert.deepStrictEqual(sourceCodeLocation, {
            startLine: 1,
            startCol: 35,
            startOffset: 34,
            endLine: 1,
            endCol: 50,
            endOffset: 49
        });
    });

    parser.end(html);
};

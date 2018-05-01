'use strict';

const assert = require('assert');
const SAXParser = require('../lib');
const loadSAXParserTestData = require('../../../test/utils/load-sax-parser-test-data');
const { makeChunks } = require('../../../test/utils/common');

exports['Location info (SAX)'] = function() {
    loadSAXParserTestData().forEach(test => {
        //NOTE: we've already tested the correctness of the location info with the Tokenizer tests.
        //So here we just check that SAXParser provides this info in the handlers.
        const parser = new SAXParser({ sourceCodeLocationInfo: true });
        const chunks = makeChunks(test.src);
        const lastChunkIdx = chunks.length - 1;

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

        chunks.forEach((chunk, idx) => {
            if (idx === lastChunkIdx) {
                parser.end(chunk);
            } else {
                parser.write(chunk);
            }
        });
    });
};

exports['Regression - location info for text (GH-153)'] = function() {
    const html = '<!DOCTYPE html><html><head><title>Here is a title</title></html>';
    const parser = new SAXParser({ sourceCodeLocationInfo: true });
    const texts = [];

    parser.on('text', ({ sourceCodeLocation }) => {
        texts.push(html.substring(sourceCodeLocation.startOffset, sourceCodeLocation.endOffset));
    });

    parser.end(html);

    assert.deepEqual(texts, ['Here is a title']);
};

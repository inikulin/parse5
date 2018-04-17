'use strict';

var assert = require('assert'),
    SAXParser = require('../../lib').SAXParser,
    testUtils = require('../test_utils');

exports['Location info (SAX)'] = function() {
    testUtils.loadSAXParserTestData().forEach(function(test) {
        //NOTE: we've already tested the correctness of the location info with the Tokenizer tests.
        //So here we just check that SAXParser provides this info in the handlers.
        var parser = new SAXParser({ locationInfo: true }),
            chunks = testUtils.makeChunks(test.src),
            lastChunkIdx = chunks.length - 1,
            handler = function() {
                var locationInfo = arguments[arguments.length - 1];

                assert.strictEqual(typeof locationInfo.startLine, 'number');
                assert.strictEqual(typeof locationInfo.startCol, 'number');
                assert.strictEqual(typeof locationInfo.startOffset, 'number');
                assert.strictEqual(typeof locationInfo.endOffset, 'number');
                assert.ok(locationInfo.startOffset < locationInfo.endOffset);
            };

        parser.on('startTag', handler);
        parser.on('endTag', handler);
        parser.on('doctype', handler);
        parser.on('comment', handler);
        parser.on('text', handler);

        chunks.forEach(function(chunk, idx) {
            if (idx === lastChunkIdx) {
                parser.end(chunk);
            } else {
                parser.write(chunk);
            }
        });
    });
};

exports['Regression - location info for text (GH-153)'] = function() {
    var html = '<!DOCTYPE html><html><head><title>Here is a title</title></html>',
        parser = new SAXParser({ locationInfo: true }),
        texts = [];

    parser.on('text', function(text, location) {
        texts.push(html.substring(location.startOffset, location.endOffset));
    });

    parser.end(html);

    assert.deepEqual(texts, ['Here is a title']);
};

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Writable } = require('stream');
const SAXParser = require('../lib');
const loadSAXParserTestData = require('../../../test/utils/load-sax-parser-test-data');
const { getStringDiffMsg, makeChunks, removeNewLines } = require('../../../test/utils/common');

function getFullTestName(test, idx) {
    return ['SAX - ', idx, '.', test.name].join('');
}

function sanitizeForComparison(str) {
    return removeNewLines(str)
        .replace(/\s/g, '')
        .replace(/'/g, '"')
        .toLowerCase();
}

function createBasicTest(html, expected, options) {
    return function() {
        //NOTE: the idea of the test is to serialize back given HTML using SAXParser handlers
        let actual = '';
        const parser = new SAXParser(options);
        const chunks = makeChunks(html);
        const lastChunkIdx = chunks.length - 1;

        parser.on('doctype', (name, publicId, systemId) => {
            actual += '<!DOCTYPE ' + name;

            if (publicId !== null) {
                actual += ' PUBLIC "' + publicId + '"';
            } else if (systemId !== null) {
                actual += ' SYSTEM';
            }

            if (systemId !== null) {
                actual += ' "' + systemId + '"';
            }

            actual += '>';
        });

        parser.on('startTag', (tagName, attrs, selfClosing) => {
            actual += '<' + tagName;

            if (attrs.length) {
                for (let i = 0; i < attrs.length; i++) {
                    actual += ' ' + attrs[i].name + '="' + attrs[i].value + '"';
                }
            }

            actual += selfClosing ? '/>' : '>';
        });

        parser.on('endTag', tagName => {
            actual += '</' + tagName + '>';
        });

        parser.on('text', text => {
            actual += text;
        });

        parser.on('comment', text => {
            actual += '<!--' + text + '-->';
        });

        parser.once('finish', () => {
            expected = sanitizeForComparison(expected);
            actual = sanitizeForComparison(actual);

            //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
            assert.ok(actual === expected, getStringDiffMsg(actual, expected));
        });

        chunks.forEach((chunk, idx) => {
            if (idx === lastChunkIdx) {
                parser.end(chunk);
            } else {
                parser.write(chunk);
            }
        });
    };
}

//Basic tests
loadSAXParserTestData().forEach((test, idx) => {
    const testName = getFullTestName(test, idx);

    exports[testName] = createBasicTest(test.src, test.expected, test.options);
});

exports['SAX - Piping and .stop()'] = function(done) {
    const parser = new SAXParser();
    const writable = new Writable();
    let handlerCallCount = 0;
    let data = '';

    const handler = function() {
        handlerCallCount++;

        if (handlerCallCount === 10) {
            parser.stop();
        }
    };

    writable._write = function(chunk, encoding, callback) {
        data += chunk;
        callback();
    };

    fs
        .createReadStream(path.join(__dirname, '../../../test/data/huge-page/huge-page.html'))
        .pipe(parser)
        .pipe(writable);

    parser.on('startTag', handler);
    parser.on('endTag', handler);
    parser.on('doctype', handler);
    parser.on('comment', handler);
    parser.on('text', handler);

    writable.once('finish', () => {
        const expected = fs
            .readFileSync(path.join(__dirname, '../../../test/data/huge-page/huge-page.html'))
            .toString();

        assert.strictEqual(handlerCallCount, 10);
        assert.strictEqual(data, expected);
        done();
    });
};

exports['Regression-SAX-SAX parser silently exits on big files (GH-97)'] = function(done) {
    const parser = new SAXParser();

    fs.createReadStream(path.join(__dirname, '../../../test/data/huge-page/huge-page.html')).pipe(parser);

    //NOTE: This is a smoke test - in case of regression it will fail with timeout.
    parser.once('finish', done);
};

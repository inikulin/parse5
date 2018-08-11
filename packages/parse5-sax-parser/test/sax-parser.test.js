'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SAXParser = require('../lib');
const loadSAXParserTestData = require('../../../test/utils/load-sax-parser-test-data');
const {
    getStringDiffMsg,
    writeChunkedToStream,
    removeNewLines,
    WritableStreamStub
} = require('../../../test/utils/common');

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

        parser.on('doctype', ({ name, publicId, systemId }) => {
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

        parser.on('startTag', ({ tagName, attrs, selfClosing }) => {
            actual += '<' + tagName;

            if (attrs.length) {
                for (let i = 0; i < attrs.length; i++) {
                    actual += ' ' + attrs[i].name + '="' + attrs[i].value + '"';
                }
            }

            actual += selfClosing ? '/>' : '>';
        });

        parser.on('endTag', ({ tagName }) => {
            actual += '</' + tagName + '>';
        });

        parser.on('text', ({ text }) => {
            actual += text;
        });

        parser.on('comment', ({ text }) => {
            actual += '<!--' + text + '-->';
        });

        parser.once('finish', () => {
            expected = sanitizeForComparison(expected);
            actual = sanitizeForComparison(actual);

            //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
            assert.ok(actual === expected, getStringDiffMsg(actual, expected));
        });

        writeChunkedToStream(html, parser);
    };
}

//Basic tests
loadSAXParserTestData().forEach(
    (test, idx) => (exports[`SAX - ${idx + 1}.${test.name}`] = createBasicTest(test.src, test.expected, test.options))
);

exports['SAX - Piping and .stop()'] = function(done) {
    const parser = new SAXParser();
    const writable = new WritableStreamStub();
    let handlerCallCount = 0;

    const handler = function() {
        handlerCallCount++;

        if (handlerCallCount === 10) {
            parser.stop();
        }
    };

    fs.createReadStream(path.join(__dirname, '../../../test/data/huge-page/huge-page.html'), 'utf8')
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
        assert.strictEqual(writable.writtenData, expected);
        done();
    });
};

exports['Regression - SAX - Parser silently exits on big files (GH-97)'] = function(done) {
    const parser = new SAXParser();

    fs.createReadStream(path.join(__dirname, '../../../test/data/huge-page/huge-page.html'), 'utf8').pipe(parser);

    //NOTE: This is a smoke test - in case of regression it will fail with timeout.
    parser.once('finish', done);
};

exports['Regression - SAX - Last text chunk must be flushed (GH-271)'] = done => {
    const parser = new SAXParser();
    let foundText = false;

    parser.on('text', ({ text }) => {
        foundText = true;
        assert.strictEqual(text, 'text');
    });

    parser.once('finish', () => {
        assert.ok(foundText);
        done();
    });

    parser.write('text');
    parser.end();
};

exports['Regression - SAX - Should not accept binary input (GH-269)'] = () => {
    const stream = new SAXParser();
    const buf = Buffer.from('test');

    assert.throws(() => stream.write(buf), TypeError);
};

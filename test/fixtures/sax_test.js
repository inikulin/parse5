'use strict';

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    WritableStream = require('stream').Writable,
    SAXParser = require('../../lib').SAXParser,
    testUtils = require('../test_utils');

function getFullTestName(test, idx) {
    return ['SAX - ', idx, '.', test.name].join('');
}

function sanitizeForComparison(str) {
    return testUtils
        .removeNewLines(str)
        .replace(/\s/g, '')
        .replace(/'/g, '"')
        .toLowerCase();
}

function createBasicTest(html, expected, options) {
    return function() {
        //NOTE: the idea of the test is to serialize back given HTML using SAXParser handlers
        var actual = '',
            parser = new SAXParser(options),
            chunks = testUtils.makeChunks(html),
            lastChunkIdx = chunks.length - 1;

        parser.on('doctype', function(name, publicId, systemId) {
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

        parser.on('startTag', function(tagName, attrs, selfClosing) {
            actual += '<' + tagName;

            if (attrs.length) {
                for (var i = 0; i < attrs.length; i++) {
                    actual += ' ' + attrs[i].name + '="' + attrs[i].value + '"';
                }
            }

            actual += selfClosing ? '/>' : '>';
        });

        parser.on('endTag', function(tagName) {
            actual += '</' + tagName + '>';
        });

        parser.on('text', function(text) {
            actual += text;
        });

        parser.on('comment', function(text) {
            actual += '<!--' + text + '-->';
        });

        parser.once('finish', function() {
            expected = sanitizeForComparison(expected);
            actual = sanitizeForComparison(actual);

            //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
            assert.ok(actual === expected, testUtils.getStringDiffMsg(actual, expected));
        });

        chunks.forEach(function(chunk, idx) {
            if (idx === lastChunkIdx) {
                parser.end(chunk);
            } else {
                parser.write(chunk);
            }
        });
    };
}

//Basic tests
testUtils.loadSAXParserTestData().forEach(function(test, idx) {
    var testName = getFullTestName(test, idx);

    exports[testName] = createBasicTest(test.src, test.expected, test.options);
});

exports['SAX - Piping and .stop()'] = function(done) {
    var parser = new SAXParser(),
        writable = new WritableStream(),
        handlerCallCount = 0,
        data = '',
        handler = function() {
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
        .createReadStream(path.join(__dirname, '../data/huge-page/huge-page.html'))
        .pipe(parser)
        .pipe(writable);

    parser.on('startTag', handler);
    parser.on('endTag', handler);
    parser.on('doctype', handler);
    parser.on('comment', handler);
    parser.on('text', handler);

    writable.once('finish', function() {
        var expected = fs.readFileSync(path.join(__dirname, '../data/huge-page/huge-page.html')).toString();

        assert.strictEqual(handlerCallCount, 10);
        assert.strictEqual(data, expected);
        done();
    });
};

exports['Regression-SAX-SAX parser silently exits on big files (GH-97)'] = function(done) {
    var parser = new SAXParser();

    fs.createReadStream(path.join(__dirname, '../data/huge-page/huge-page.html')).pipe(parser);

    //NOTE: This is a smoke test - in case of regression it will fail with timeout.
    parser.once('finish', done);
};

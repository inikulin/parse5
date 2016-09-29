'use strict';

var assert = require('assert'),
    path = require('path'),
    WritableStream = require('stream').Writable,
    parse5 = require('../../lib'),
    testUtils = require('../test_utils');

function getFullTestName(test) {
    return ['Serializer - ', test.idx, '.', test.name].join('');
}

function serializeStreaming(node, opts) {
    return new Promise(function (resolve) {
        var stream = new parse5.SerializerStream(node, opts),
            result = '',
            writable = new WritableStream();

        //NOTE: use pipe to the WritableStream to test stream
        //in the `flowing` mode.
        writable._write = function (chunk, encoding, callback) {
            result += chunk.toString();
            callback();
        };

        stream.pipe(writable);

        writable.once('finish', function () {
            resolve(result);
        });
    });
}


function testStreamingSerialization(document, opts, expected, done) {
    serializeStreaming(document, opts)
        .then(testUtils.removeNewLines)
        .then(function (serializedResult) {
            var msg = 'STREAMING: ' + testUtils.getStringDiffMsg(serializedResult, expected);

            assert.ok(serializedResult === expected, msg);
            done();
        })
        .catch(done);
}

testUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, treeAdapter) {
    //Here we go..
    testUtils
        .loadSerializationTestData(path.join(__dirname, '../data/serialization'))
        .forEach(function (test) {
            _test[getFullTestName(test)] = function (done) {
                var opts = {treeAdapter: treeAdapter},
                    document = parse5.parse(test.src, opts),
                    serializedResult = testUtils.removeNewLines(parse5.serialize(document, opts)),
                    expected = testUtils.removeNewLines(test.expected);

                //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
                assert.ok(serializedResult === expected, testUtils.getStringDiffMsg(serializedResult, expected));

                testStreamingSerialization(document, opts, expected, done);
            };
        });
});

exports['Regression - Get text node\'s parent tagName only if it\'s an Element node (GH-38)'] = {
    test: function () {
        var document = parse5.parse('<template>yo<div></div>42</template>'),
            originalGetTagName = this.originalGetTagName = parse5.treeAdapters.default.getTagName;

        parse5.treeAdapters.default.getTagName = function (element) {
            assert.ok(element.tagName);

            return originalGetTagName(element);
        };

        parse5.serialize(document);
    },

    after: function () {
        parse5.treeAdapters.default.getTagName = this.originalGetTagName;
    }
};

exports['Regression - SYSTEM-only doctype serialization'] = function () {
    var html = '<!DOCTYPE html SYSTEM "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
               '<html><head></head><body></body></html>',
        document = parse5.parse(html),
        serializedResult = parse5.serialize(document);

    assert.strictEqual(serializedResult, html);
};

exports['Regression - Escaping of doctypes with quotes in them'] = function () {
    var htmlStrs = [
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ' +
        '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
        '<html><head></head><body></body></html>',

        '<!DOCTYPE html PUBLIC \'-//W3C//"DTD" XHTML 1.0 Transitional//EN\' ' +
        '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
        '<html><head></head><body></body></html>',

        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ' +
        '\'http://www.w3.org/TR/xhtml1/DTD/"xhtml1-transitional.dtd"\'>' +
        '<html><head></head><body></body></html>'
    ];

    htmlStrs.forEach(function (html) {
        var document = parse5.parse(html),
            serializedResult = parse5.serialize(document);

        assert.strictEqual(serializedResult, html);
    });
};

exports['Regression - new line in <pre> tag'] = function () {
    var htmlStrs = [
        {
            src: '<!DOCTYPE html><html><head></head><body><pre>\ntest</pre></body></html>',
            expected: '<!DOCTYPE html><html><head></head><body><pre>test</pre></body></html>'
        },

        {
            src: '<!DOCTYPE html><html><head></head><body><pre>\n\ntest</pre></body></html>',
            expected: '<!DOCTYPE html><html><head></head><body><pre>\n\ntest</pre></body></html>'
        }
    ];

    htmlStrs.forEach(function (htmlStr) {
        var document = parse5.parse(htmlStr.src),
            serializedResult = parse5.serialize(document);

        assert.strictEqual(serializedResult, htmlStr.expected);
    });
};

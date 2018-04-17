'use strict';

var assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    WritableStream = require('stream').Writable,
    parse5 = require('../../lib'),
    testUtils = require('../test_utils');

function serializeStreaming(node, opts) {
    return new Promise(function(resolve) {
        var stream = new parse5.SerializerStream(node, opts),
            result = '',
            writable = new WritableStream();

        //NOTE: use pipe to the WritableStream to test stream
        //in the `flowing` mode.
        writable._write = function(chunk, encoding, callback) {
            result += chunk.toString();
            callback();
        };

        stream.pipe(writable);

        writable.once('finish', function() {
            resolve(result);
        });
    });
}

function testStreamingSerialization(document, opts, expected, removeNewLines, done) {
    serializeStreaming(document, opts)
        .then(function(serializedResult) {
            return removeNewLines ? testUtils.removeNewLines(serializedResult) : serializedResult;
        })
        .then(function(serializedResult) {
            var msg = 'STREAMING: ' + testUtils.getStringDiffMsg(serializedResult, expected);

            assert.ok(serializedResult === expected, msg);
            done();
        })
        .catch(done);
}

(function createTests() {
    function getFullTestName(idx, test) {
        return ['Serializer - ', idx, '.', test.name].join('');
    }

    var data = fs.readFileSync(path.join(__dirname, '../data/serialization/tests.json')),
        tests = JSON.parse(data);

    testUtils.generateTestsForEachTreeAdapter(module.exports, function(_test, treeAdapter) {
        tests.forEach(function(test, idx) {
            _test[getFullTestName(idx, test)] = function(done) {
                var opts = { treeAdapter: treeAdapter },
                    document = parse5.parse(test.input, opts),
                    serializedResult = parse5.serialize(document, opts);

                //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
                assert.ok(
                    serializedResult === test.expected,
                    testUtils.getStringDiffMsg(serializedResult, test.expected)
                );

                testStreamingSerialization(document, opts, test.expected, false, done);
            };
        });
    });
})();

exports["Regression - Get text node's parent tagName only if it's an Element node (GH-38)"] = {
    test: function() {
        var document = parse5.parse('<template>yo<div></div>42</template>'),
            originalGetTagName = (this.originalGetTagName = parse5.treeAdapters.default.getTagName);

        parse5.treeAdapters.default.getTagName = function(element) {
            assert.ok(element.tagName);

            return originalGetTagName(element);
        };

        parse5.serialize(document);
    },

    after: function() {
        parse5.treeAdapters.default.getTagName = this.originalGetTagName;
    }
};

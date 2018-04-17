'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const WritableStream = require('stream').Writable;
const parse5 = require('../../lib');
const testUtils = require('../test_utils');

function serializeStreaming(node, opts) {
    return new Promise(resolve => {
        const stream = new parse5.SerializerStream(node, opts);
        let result = '';
        const writable = new WritableStream();

        //NOTE: use pipe to the WritableStream to test stream
        //in the `flowing` mode.
        writable._write = function(chunk, encoding, callback) {
            result += chunk.toString();
            callback();
        };

        stream.pipe(writable);

        writable.once('finish', () => {
            resolve(result);
        });
    });
}

function testStreamingSerialization(document, opts, expected, removeNewLines, done) {
    serializeStreaming(document, opts)
        .then(serializedResult => {
            return removeNewLines ? testUtils.removeNewLines(serializedResult) : serializedResult;
        })
        .then(serializedResult => {
            const msg = 'STREAMING: ' + testUtils.getStringDiffMsg(serializedResult, expected);

            assert.ok(serializedResult === expected, msg);
            done();
        })
        .catch(done);
}

(function createTests() {
    function getFullTestName(idx, test) {
        return ['Serializer - ', idx, '.', test.name].join('');
    }

    const data = fs.readFileSync(path.join(__dirname, '../data/serialization/tests.json'));
    const tests = JSON.parse(data);

    testUtils.generateTestsForEachTreeAdapter(module.exports, (_test, treeAdapter) => {
        tests.forEach((test, idx) => {
            _test[getFullTestName(idx, test)] = function(done) {
                const opts = { treeAdapter: treeAdapter };
                const document = parse5.parse(test.input, opts);
                const serializedResult = parse5.serialize(document, opts);

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
        const document = parse5.parse('<template>yo<div></div>42</template>');
        const originalGetTagName = (this.originalGetTagName = parse5.treeAdapters.default.getTagName);

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

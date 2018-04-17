'use strict';

var path = require('path'),
    assert = require('assert'),
    ParserStream = require('../../lib').ParserStream,
    testUtils = require('../test_utils');

function getFullTestName(test) {
    return ['Scripting - ', test.idx, '.', test.setName, ' - ', test.input].join('');
}

function pause() {
    return new Promise(function(resolve) {
        setTimeout(resolve, 5);
    });
}

function parse(html, treeAdapter) {
    return new Promise(function(resolve, reject) {
        var chunks = testUtils.makeChunks(html),
            parser = new ParserStream({ treeAdapter: treeAdapter }),
            document = parser.document;

        parser.once('finish', function() {
            resolve(document);
        });

        parser.on('script', function(scriptElement, documentWrite, resume) {
            var scriptTextNode = treeAdapter.getChildNodes(scriptElement)[0],
                script = scriptTextNode && treeAdapter.getTextNodeContent(scriptTextNode);

            document.write = documentWrite;

            //NOTE: emulate postponed script execution
            pause()
                .then(function() {
                    /* eslint-disable no-eval */
                    eval(script);
                    /* eslint-enable no-eval */
                    resume();
                })
                .catch(reject);
        });

        var lastChunkIdx = chunks.length - 1;

        //NOTE: emulate async input stream behavior
        chunks
            .reduce(function(promiseChain, chunk, idx) {
                return promiseChain
                    .then(function() {
                        if (idx === lastChunkIdx) {
                            parser.end(chunk);
                        } else {
                            parser.write(chunk);
                        }
                    })
                    .then(pause);
            }, Promise.resolve())
            .catch(reject);
    });
}

//Here we go..
testUtils.generateTestsForEachTreeAdapter(module.exports, function(_test, treeAdapter) {
    testUtils
        .loadTreeConstructionTestData([path.join(__dirname, '../data/tree_construction_scripting')], treeAdapter)
        .forEach(function(test) {
            _test[getFullTestName(test)] = function(done) {
                parse(test.input, treeAdapter)
                    .then(function(document) {
                        var actual = testUtils.serializeToTestDataFormat(document, treeAdapter),
                            msg = testUtils.prettyPrintParserAssertionArgs(actual, test.expected);

                        assert.strictEqual(actual, test.expected, msg);

                        done();
                    })
                    .catch(done);
            };
        });

    _test['Regression - Synchronously calling resume() leads to crash (GH-98)'] = function(done) {
        var parser = new ParserStream({ treeAdapter: treeAdapter });

        parser.on('script', function(el, docWrite, resume) {
            resume();
        });

        parser.end('<!doctype html><script>abc</script>');

        process.nextTick(done);
    };

    _test['Regression - Parsing loop lock causes accidental hang ups (GH-101)'] = function(done) {
        var parser = new ParserStream({ treeAdapter: treeAdapter });

        parser.once('finish', function() {
            done();
        });

        parser.on('script', function(scriptElement, documentWrite, resume) {
            process.nextTick(function() {
                resume();
            });
        });

        parser.write('<script>yo</script>');
        parser.end('dawg');
    };
});

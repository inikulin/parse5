'use strict';

const path = require('path');
const assert = require('assert');
const { ParserStream } = require('../../lib');
const testUtils = require('../test-utils');

function getFullTestName(test) {
    return ['Scripting - ', test.idx, '.', test.setName, ' - ', test.input].join('');
}

function pause() {
    return new Promise(resolve => {
        setTimeout(resolve, 5);
    });
}

function parse(html, treeAdapter) {
    return new Promise((resolve, reject) => {
        const chunks = testUtils.makeChunks(html);
        const parser = new ParserStream({ treeAdapter: treeAdapter });
        const document = parser.document;

        parser.once('finish', () => {
            resolve(document);
        });

        parser.on('script', (scriptElement, documentWrite, resume) => {
            const scriptTextNode = treeAdapter.getChildNodes(scriptElement)[0];
            const script = scriptTextNode && treeAdapter.getTextNodeContent(scriptTextNode);

            document.write = documentWrite;

            //NOTE: emulate postponed script execution
            pause()
                .then(() => {
                    /* eslint-disable no-eval */
                    eval(script);
                    /* eslint-enable no-eval */
                    resume();
                })
                .catch(reject);
        });

        const lastChunkIdx = chunks.length - 1;

        //NOTE: emulate async input stream behavior
        chunks
            .reduce((promiseChain, chunk, idx) => {
                return promiseChain
                    .then(() => {
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
testUtils.generateTestsForEachTreeAdapter(module.exports, (_test, treeAdapter) => {
    testUtils
        .loadTreeConstructionTestData([path.join(__dirname, '../data/tree-construction-scripting')], treeAdapter)
        .forEach(test => {
            _test[getFullTestName(test)] = function(done) {
                parse(test.input, treeAdapter)
                    .then(document => {
                        const actual = testUtils.serializeToTestDataFormat(document, treeAdapter);
                        const msg = testUtils.prettyPrintParserAssertionArgs(actual, test.expected);

                        assert.strictEqual(actual, test.expected, msg);

                        done();
                    })
                    .catch(done);
            };
        });

    _test['Regression - Synchronously calling resume() leads to crash (GH-98)'] = function(done) {
        const parser = new ParserStream({ treeAdapter: treeAdapter });

        parser.on('script', (el, docWrite, resume) => {
            resume();
        });

        parser.end('<!doctype html><script>abc</script>');

        process.nextTick(done);
    };

    _test['Regression - Parsing loop lock causes accidental hang ups (GH-101)'] = function(done) {
        const parser = new ParserStream({ treeAdapter: treeAdapter });

        parser.once('finish', () => {
            done();
        });

        parser.on('script', (scriptElement, documentWrite, resume) => {
            process.nextTick(() => {
                resume();
            });
        });

        parser.write('<script>yo</script>');
        parser.end('dawg');
    };
});

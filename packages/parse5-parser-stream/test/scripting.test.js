'use strict';

const path = require('path');
const ParserStream = require('../lib');
const generateParsingTests = require('../../../test/utils/generate-parsing-tests');
const { makeChunks, generateTestsForEachTreeAdapter } = require('../../../test/utils/common');

function pause() {
    return new Promise(resolve => setTimeout(resolve, 5));
}

generateParsingTests(
    module.exports,
    'ParserStream - Scripting',
    {
        skipFragments: true,
        withoutErrors: true,
        testSuite: [path.join(__dirname, '../../../test/data/tree-construction-scripting')]
    },
    async (test, opts) => {
        const chunks = makeChunks(test.input);
        const parser = new ParserStream(opts);
        const document = parser.document;

        const completionPromise = new Promise((resolve, reject) => {
            parser.once('finish', () => resolve({ node: document }));

            parser.on('script', async (scriptElement, documentWrite, resume) => {
                const scriptTextNode = opts.treeAdapter.getChildNodes(scriptElement)[0];
                const script = scriptTextNode && opts.treeAdapter.getTextNodeContent(scriptTextNode);

                document.write = documentWrite;

                //NOTE: emulate postponed script execution
                await pause();

                try {
                    /* eslint-disable no-eval */
                    eval(script);
                    /* eslint-enable no-eval */
                    resume();
                } catch (err) {
                    reject(err);
                }
            });
        });

        //NOTE: emulate async input stream behavior
        for (const chunk of chunks) {
            parser.write(chunk);
            await pause();
        }

        parser.end();

        return completionPromise;
    }
);

generateTestsForEachTreeAdapter(module.exports, (_test, treeAdapter) => {
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

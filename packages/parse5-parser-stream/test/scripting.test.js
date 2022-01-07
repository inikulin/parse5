import { ParserStream } from '../lib/index.js';
import { generateParsingTests } from '../../../test/utils/generate-parsing-tests.js';
import { makeChunks, generateTestsForEachTreeAdapter } from '../../../test/utils/common.js';

function pause() {
    return new Promise((resolve) => setTimeout(resolve, 5));
}

const suitePath = new URL('../../../test/data/tree-construction-scripting', import.meta.url);

generateParsingTests(
    'ParserStream - Scripting',
    'ParserStream - Scripting',
    {
        skipFragments: true,
        withoutErrors: true,
        testSuite: [suitePath.pathname],
    },
    async (test, opts) => {
        const chunks = makeChunks(test.input);
        const parser = new ParserStream(opts);
        const { document } = parser;

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
                } catch (error) {
                    reject(error);
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

generateTestsForEachTreeAdapter('ParserStream', (_test, treeAdapter) => {
    _test['Regression - Synchronously calling resume() leads to crash (GH-98)'] = function (done) {
        const parser = new ParserStream({ treeAdapter });

        parser.on('script', (el, docWrite, resume) => {
            resume();
        });

        parser.end('<!doctype html><script>abc</script>');

        process.nextTick(done);
    };

    _test['Regression - Parsing loop lock causes accidental hang ups (GH-101)'] = function (done) {
        const parser = new ParserStream({ treeAdapter });

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

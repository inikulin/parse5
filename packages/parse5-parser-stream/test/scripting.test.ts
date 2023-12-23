import { ParserStream } from '../lib/index.js';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { makeChunks, generateTestsForEachTreeAdapter, finished } from 'parse5-test-utils/utils/common.js';
import { runInNewContext } from 'node:vm';

function pause(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 5));
}

const suitePath = new URL('../../../test/data/tree-construction-scripting', import.meta.url);

generateParsingTests(
    'ParserStream - Scripting',
    'ParserStream - Scripting',
    {
        withoutErrors: true,
        suitePath,
    },
    async (test, opts) => {
        const chunks = makeChunks(test.input);
        const parser = test.fragmentContext
            ? ParserStream.getFragmentStream(test.fragmentContext, opts)
            : new ParserStream(opts);

        parser.on('script', async (scriptElement, documentWrite, resume) => {
            const scriptTextNode = opts.treeAdapter.getChildNodes(scriptElement)[0];
            const script = scriptTextNode ? opts.treeAdapter.getTextNodeContent(scriptTextNode) : '';

            //NOTE: emulate postponed script execution
            await pause();

            try {
                runInNewContext(script, { document: { write: documentWrite } });
                resume();
            } catch (error) {
                parser.emit('error', error);
            }
        });

        //NOTE: emulate async input stream behavior
        for (const chunk of chunks) {
            parser.write(chunk);
            await pause();
        }

        parser.end();

        await finished(parser);

        return {
            node: test.fragmentContext ? parser.getFragment() : parser.document,
            chunks,
        };
    },
);

generateTestsForEachTreeAdapter('ParserStream', (treeAdapter) => {
    test('Regression - Synchronously calling resume() leads to crash (GH-98)', (done) => {
        const parser = new ParserStream({ treeAdapter });

        parser.on('script', (_el, _docWrite, resume) => resume());

        parser.end('<!doctype html><script>abc</script>');

        process.nextTick(done);
    });

    test('Regression - Parsing loop lock causes accidental hang ups (GH-101)', () => {
        const parser = new ParserStream({ treeAdapter });

        parser.on('script', (_scriptElement, _documentWrite, resume) => process.nextTick(resume));

        parser.write('<script>yo</script>');
        parser.end('dawg');

        return finished(parser);
    });
});

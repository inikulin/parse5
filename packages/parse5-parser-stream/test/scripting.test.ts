import { it, assert } from 'vitest';
import { serialize, type DefaultTreeAdapterTypes } from 'parse5';
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
    it('Regression - Synchronously calling resume() leads to crash (GH-98)', async () => {
        const parser = new ParserStream({ treeAdapter });

        parser.on('script', (_el, _docWrite, resume) => resume());

        parser.end('<!doctype html><script>abc</script>');

        await new Promise((resolve) => {
            process.nextTick(resolve);
        });
    });

    it('Regression - Parsing loop lock causes accidental hang ups (GH-101)', () => {
        const parser = new ParserStream({ treeAdapter });

        parser.on('script', (_scriptElement, _documentWrite, resume) => process.nextTick(resume));

        parser.write('<script>yo</script>');
        parser.end('dawg');

        return finished(parser);
    });
});

it('decides an annotation-xml integration point from its start tag', async () => {
    const parser = new ParserStream();

    parser.on('script', (scriptElement, _documentWrite, resume) => {
        (scriptElement.parentNode as DefaultTreeAdapterTypes.Element).attrs[0].value = 'application/xml';
        resume();
    });

    parser.end('<math><annotation-xml encoding=text/html><script></script><x-a/>TAIL<![CDATA[x]]>');
    await finished(parser);

    // The script edits `encoding` after the start tag, so the element stays an HTML integration point.
    assert.strictEqual(
        serialize(parser.document),
        '<html><head></head><body><math><annotation-xml encoding="application/xml"><script></script><x-a>TAIL<!--[CDATA[x]]--></x-a></annotation-xml></math></body></html>',
    );
});

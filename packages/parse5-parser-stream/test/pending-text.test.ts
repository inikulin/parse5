import { assert, expect, it } from 'vitest';
import { once } from 'node:events';
import { serialize, type TreeAdapterTypeMap } from 'parse5';
import { ParserStream } from '../lib/index.js';
import { finished, generateTestsForEachTreeAdapter } from 'parse5-test-utils/utils/common.js';

generateTestsForEachTreeAdapter('pending text', (treeAdapter) => {
    function createStream(runs: string[]): ParserStream<TreeAdapterTypeMap> {
        return new ParserStream({
            treeAdapter: {
                ...treeAdapter,
                insertText(parent, text): void {
                    runs.push(text);
                    treeAdapter.insertText(parent, text);
                },
                insertTextBefore(parent, text, reference): void {
                    runs.push(text);
                    treeAdapter.insertTextBefore(parent, text, reference);
                },
            },
        });
    }

    it('flushes pending text on destruction and preserves the error', async () => {
        const stream = new ParserStream({ treeAdapter });
        stream.write('<p>a b');
        const result = finished(stream);
        const error = new Error('aborted');
        stream.destroy(error);
        await expect(result).rejects.toBe(error);
        assert.equal(serialize(stream.document, { treeAdapter }), '<html><head></head><body><p>a </p></body></html>');
    });

    it('flushes on destruction inside a parser callback without processing the remaining input', async () => {
        const stream = new ParserStream({
            treeAdapter: {
                ...treeAdapter,
                onItemPop(node): void {
                    if (treeAdapter.getTagName(node) === 'colgroup') stream.destroy();
                },
            },
        });
        const closed = once(stream, 'close');
        stream.write('<table><colgroup> \nx y</table><p>after');
        await closed;
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body><table><colgroup> \n</colgroup></table></body></html>',
        );
    });

    it('does not resume a destroyed parser or process queued writes', async () => {
        const stream = new ParserStream({ treeAdapter });
        let resumeScript!: () => void;
        stream.on('script', (_script, write, resume) => {
            write('inserted');
            resumeScript = resume;
        });
        stream.write('<body>before<script></script>after</body>');
        stream.write('queued');
        const closed = once(stream, 'close');
        stream.destroy();
        resumeScript();
        await closed;
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body>before<script></script></body></html>',
        );
    });

    it('flushes replayed table characters before processing an ignored start tag', () => {
        const runs: string[] = [];
        const stream = createStream(runs);
        stream.write('<table>a b<html>');
        assert.deepEqual(runs, ['a b']);
        stream.end();
    });

    it('coalesces text across writes until explicitly flushed', async () => {
        const runs: string[] = [];
        const stream = createStream(runs);
        stream.write('<p>first ');
        stream.write('second ');
        assert.deepEqual(runs, []);
        stream.flushCharacters();
        assert.deepEqual(runs, ['first second ']);
        stream.flushCharacters();
        assert.deepEqual(runs, ['first second ']);
        stream.write('third fourth');
        stream.flushCharacters();
        assert.deepEqual(runs, ['first second ', 'third fourth']);
        stream.end();
        await finished(stream);
    });

    it('does not split adapter calls when the tokenizer compacts its input buffer', () => {
        const runs: string[] = [];
        const stream = createStream(runs);
        const text = 'a '.repeat(40_000);
        stream.write(`<p>${text}`);
        stream.write(text);
        assert.deepEqual(runs, []);
        stream.flushCharacters();
        assert.deepEqual(runs, [text + text]);
        stream.end();
    });

    it('flushes before executing a script that removes itself', async () => {
        const runs: string[] = [];
        const stream = createStream(runs);
        let scripts = 0;
        stream.on('script', (script, _write, resume) => {
            scripts++;
            assert.deepEqual(runs, ['before more', 'script text']);
            assert.equal(treeAdapter.getTextNodeContent(treeAdapter.getFirstChild(script)), 'script text');
            treeAdapter.detachNode(script);
            resume();
        });
        stream.end('<body>before more<script>script text</script>after more');
        await finished(stream);
        assert.equal(scripts, 1);
        assert.deepEqual(runs, ['before more', 'script text', 'after more']);
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body>before moreafter more</body></html>',
        );
    });
});

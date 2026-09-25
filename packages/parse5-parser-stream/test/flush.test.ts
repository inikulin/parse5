import { assert, describe, it } from 'vitest';
import { parse, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { ParserStream } from '../lib/index.js';
import { finished, generateTestsForEachTreeAdapter } from 'parse5-test-utils/utils/common.js';

generateTestsForEachTreeAdapter('flushCharacters', (treeAdapter) => {
    it('exposes trailing text without ending the stream', async () => {
        const stream = new ParserStream({ treeAdapter });
        stream.write('<body><p>hello');
        stream.flushCharacters();
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body><p>hello</p></body></html>',
        );
        assert.equal(stream.writableEnded, false);
        stream.flushCharacters();
        stream.write(' world');
        stream.flushCharacters();
        stream.end('</p>');
        await finished(stream);
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body><p>hello world</p></body></html>',
        );
    });

    it('does not complete a partial tag or character reference', () => {
        const stream = new ParserStream({ treeAdapter });
        stream.write('<body>before<b title="');
        stream.flushCharacters();
        assert.equal(serialize(stream.document, { treeAdapter }), '<html><head></head><body>before</body></html>');
        stream.write('value">after&not');
        stream.flushCharacters();
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body>before<b title="value">after</b></body></html>',
        );
        stream.write('in;');
        stream.flushCharacters();
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body>before<b title="value">after∉</b></body></html>',
        );
        stream.end();
    });

    it('does not bypass pending table character processing', () => {
        const stream = new ParserStream({ treeAdapter });
        stream.write('<table>text');
        stream.flushCharacters();
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body><table></table></body></html>',
        );
        stream.end('</table>');
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body>text<table></table></body></html>',
        );
    });

    it('flushes fragment text', () => {
        const stream = ParserStream.getFragmentStream(undefined, { treeAdapter });
        stream.flushCharacters();
        stream.write('hello');
        stream.flushCharacters();
        assert.equal(serialize(stream.getFragment(), { treeAdapter }), 'hello');
        stream.end();
    });

    it('rejects recursive flushing from a tree adapter', () => {
        let calls = 0;
        const stream = new ParserStream({
            treeAdapter: {
                ...treeAdapter,
                insertText(parent, text): void {
                    calls++;
                    assert.throws(() => stream.flushCharacters(), 'Cannot flush characters from a tokenizer callback');
                    treeAdapter.insertText(parent, text);
                },
            },
        });
        stream.write('<body>hello');
        stream.flushCharacters();
        assert.equal(calls, 1);
        stream.end();
    });

    it('does not resume a suspended script or process queued writes', async () => {
        const stream = new ParserStream({ treeAdapter });
        let resumeScript!: () => void;
        stream.on('script', (_script, _write, resume) => {
            assert.throws(() => stream.flushCharacters(), 'Cannot flush characters from a tokenizer callback');
            resumeScript = resume;
        });
        stream.write('<body>before<script></script>after');
        stream.write(' later');
        stream.flushCharacters();
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body>before<script></script></body></html>',
        );
        resumeScript();
        stream.flushCharacters();
        assert.equal(
            serialize(stream.document, { treeAdapter }),
            '<html><head></head><body>before<script></script>after later</body></html>',
        );
        stream.end();
        await finished(stream);
        stream.flushCharacters();
    });
});

describe('flushCharacters', () => {
    for (const [trailingText, unfinished, remainder, endLine, endCol] of [
        ['𝄞', '', '', 1, 65_546],
        ['𝄞abc', '', '', 1, 65_549],
        ['\n𝄞', '<b title="\n&am', 'p;">next</b>', 2, 3],
        ['\r\n𝄞', '&am', 'p;', 2, 3],
    ] as const) {
        it(`preserves flushed locations after buffer compaction: ${JSON.stringify(trailingText + unfinished)}`, () => {
            const stream = new ParserStream({ sourceCodeLocationInfo: true });
            // Exceed the default buffer waterline before the surrogate pair.
            const sourceText = ' '.repeat(65_537) + trailingText;
            const input = `<body>${sourceText}${unfinished}`;
            stream.write(input);
            stream.flushCharacters();
            const html = stream.document.childNodes[0] as DefaultTreeAdapterMap['element'];
            const body = html.childNodes[1] as DefaultTreeAdapterMap['element'];
            const text = body.childNodes[0] as DefaultTreeAdapterMap['textNode'];
            assert.equal(text.value, sourceText.replace('\r\n', '\n'));
            assert.deepEqual(text.sourceCodeLocation, {
                startLine: 1,
                startCol: 7,
                startOffset: 6,
                endLine,
                endCol,
                endOffset: 6 + sourceText.length,
            });
            stream.end(remainder);
            assert.deepEqual(stream.document, parse(input + remainder, { sourceCodeLocationInfo: true }));
        });
    }

    it('excludes unfinished markup from flushed text locations', () => {
        for (const suffix of [
            '<',
            '</',
            '<!',
            '<!--comment',
            '<?comment',
            '<!DOCTYPE',
            '<!DOCTYPE \n',
            '<!DOCTYPE html PUBLIC "identifier',
            '<b',
            '<b ',
            '<b attr',
            '<b attr=',
            '<b attr="value',
            '<b attr="value" /',
            '<b\nattr="\n&am',
            '&am',
        ]) {
            const stream = new ParserStream({ sourceCodeLocationInfo: true });
            stream.write(`<body>hello${suffix}`);
            stream.flushCharacters();
            const html = stream.document.childNodes[0] as DefaultTreeAdapterMap['element'];
            const body = html.childNodes[1] as DefaultTreeAdapterMap['element'];
            const text = body.childNodes[0] as DefaultTreeAdapterMap['textNode'];
            assert.equal(text.value, 'hello', suffix);
            assert.deepEqual(
                text.sourceCodeLocation,
                {
                    startLine: 1,
                    startCol: 7,
                    startOffset: 6,
                    endLine: 1,
                    endCol: 12,
                    endOffset: 11,
                },
                suffix,
            );
            stream.end();
        }
    });

    for (const [input, text, endOffset, endLine, endCol] of [
        ['<body>hello', 'hello', 11, 1, 12],
        ['<body>hello<b title="', 'hello', 11, 1, 12],
        ['<body>hello&not', 'hello', 11, 1, 12],
        ['<body>𝄞', '𝄞', 8, 1, 9],
        ['<body> 𝄞', ' 𝄞', 9, 1, 10],
        ['<body> <𝄞', ' <𝄞', 10, 1, 11],
        ['<body>hello\r\n', 'hello\n', 13, 2, 1],
        ['<body><svg><![CDATA[a]]]', 'a]', 22, 1, 23],
        ['<body><svg><![CDATA[ ]]]', ' ]', 22, 1, 23],
        ['<body><svg><![CDATA[\n]]]', '\n]', 22, 2, 2],
        ['<body><script><!--a<<', '<!--a<', 20, 1, 21],
    ] as const) {
        it(`reports the location of flushed text before the remaining input: ${JSON.stringify(input)}`, () => {
            const stream = new ParserStream({ sourceCodeLocationInfo: true });
            stream.write(input);
            stream.flushCharacters();
            const html = stream.document.childNodes[0] as DefaultTreeAdapterMap['element'];
            const body = html.childNodes[1] as DefaultTreeAdapterMap['element'];
            const node = body.childNodes[0];
            const textNode = ('childNodes' in node ? node.childNodes[0] : node) as DefaultTreeAdapterMap['textNode'];
            assert.equal(textNode.value, text);
            assert.equal(textNode.sourceCodeLocation!.endOffset, endOffset);
            assert.equal(textNode.sourceCodeLocation!.endLine, endLine);
            assert.equal(textNode.sourceCodeLocation!.endCol, endCol);
            stream.end();
        });
    }

    it('does not extend flushed text through subsequently ignored CDATA delimiters', () => {
        const stream = new ParserStream({ sourceCodeLocationInfo: true });
        stream.write('<svg><![CDATA[ ]]]');
        stream.flushCharacters();
        const html = stream.document.childNodes[0] as DefaultTreeAdapterMap['element'];
        const body = html.childNodes[1] as DefaultTreeAdapterMap['element'];
        const svg = body.childNodes[0] as DefaultTreeAdapterMap['element'];
        const text = svg.childNodes[0] as DefaultTreeAdapterMap['textNode'];
        assert.equal(text.value, ' ]');
        assert.equal(text.sourceCodeLocation!.endOffset, 16);
        assert.equal(text.sourceCodeLocation!.endCol, 17);
        const location = { ...text.sourceCodeLocation };
        stream.write('>');
        stream.flushCharacters();
        stream.end('</svg>');
        assert.equal(text.value, ' ]');
        assert.deepEqual(text.sourceCodeLocation, location);
    });

    it('does not include an ignored leading newline in the next flushed run', () => {
        const stream = new ParserStream({ sourceCodeLocationInfo: true });
        stream.write('<pre>\n');
        stream.flushCharacters();
        stream.write('\nA');
        stream.flushCharacters();
        const html = stream.document.childNodes[0] as DefaultTreeAdapterMap['element'];
        const body = html.childNodes[1] as DefaultTreeAdapterMap['element'];
        const pre = body.childNodes[0] as DefaultTreeAdapterMap['element'];
        const text = pre.childNodes[0] as DefaultTreeAdapterMap['textNode'];
        assert.equal(text.value, '\nA');
        assert.equal(text.sourceCodeLocation!.startOffset, 6);
        assert.equal(text.sourceCodeLocation!.startLine, 2);
        assert.equal(text.sourceCodeLocation!.startCol, 1);
        stream.end('</pre>');
    });

    for (const input of [
        '<body>hello world',
        '<body>a<b title="value">b</b>c',
        '<body>hello<b title="a&notin;\nx" id=b>world',
        '<body>a<!--comment-->b',
        '<body>a&notin;b&#13;c',
        '<body>a\u0000b',
        '<body>a\r\nb\nc\rd',
        '<body>𝄞x𝄞',
        '<body> <𝄞x𝄞',
        '<textarea>a&lt;b</textarea>c',
        '<style>a<b</style>c',
        '<script>a<!--b-->c</script>d',
        '<body><plaintext>a<b&notin;',
        '<body><svg><![CDATA[a]]]]>b</svg>c',
        '<body>a<1b</>c',
    ]) {
        it(`preserves the tree and locations across single-code-unit writes: ${JSON.stringify(input)}`, () => {
            const stream = new ParserStream({ sourceCodeLocationInfo: true });
            for (let i = 0; i < input.length; i++) {
                stream.write(input[i]);
                stream.flushCharacters();
            }
            stream.end();
            assert.deepEqual(stream.document, parse(input, { sourceCodeLocationInfo: true }));
        });
    }
});

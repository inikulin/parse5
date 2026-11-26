import { assert, it } from 'vitest';
import { parse, parseFragment, serialize } from 'parse5';
import { generateTestsForEachTreeAdapter } from 'parse5-test-utils/utils/common.js';

generateTestsForEachTreeAdapter('pending text', (treeAdapter) => {
    it.each([
        ['<p>a b c d</p>', ['a b c d']],
        ['<p>a&amp;b<1c&lt;d</p>', ['a&b<1c<d']],
        ['<p>a\u0000 b</p>', ['a b']],
        ['<p>first run</bogus>second run</bogus2>third run', ['first run', 'second run', 'third run']],
        ['<p>first run<!DOCTYPE html>second run', ['first run', 'second run']],
        ['<p>first run<!--comment-->second run', ['first run', 'second run']],
        ['<textarea>\nfirst run</textarea>', ['first run']],
        ['<style>before</scripty>after more text</style>', ['before</scripty>after more text']],
        ['<svg>a\u0000 b</svg>', ['a\uFFFD b']],
        ['<svg><![CDATA[a b]]>c d</svg>', ['a bc d']],
        ['<table>a b</bogus>c d</table>', ['a b', 'c d']],
        ['<table>a b<html>c d</table>', ['a b', 'c d']],
        ['<table> \n </bogus> \t </table>', [' \n ', ' \t ']],
        ['<table>\u0000</table>', []],
        ['<table>a b<tr><td>c d</td></tr>e f</table>', ['a b', 'c d', 'e f']],
        ['<table><colgroup> x<tr><td>y</td></tr></table>', [' ', 'x', 'y']],
        ['<div>A<table><b><tbody> C D </table></div>', ['A', ' C D ']],
        ['<head></head> \n a b', [' \n ', 'a b']],
        ['<p><b>one</p> \n two', ['one', ' \n two']],
        ['<body>a b</body> \n c d', ['a b', ' \n c d']],
        ['<p>a b', ['a b']],
    ] as const)('inserts whole runs for %j', (input, expected) => {
        const runs: string[] = [];
        parse(input, {
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
        assert.deepEqual(runs, expected);
    });

    it('flushes before implicitly creating the body element', () => {
        const precedingText: string[] = [];
        parse('<head></head> \n x', {
            treeAdapter: {
                ...treeAdapter,
                onElementCreated(element, context): void {
                    if (treeAdapter.getTagName(element) === 'body') {
                        precedingText.push(serialize(context.intendedParent, { treeAdapter }));
                    }
                },
            },
        });
        assert.deepEqual(precedingText, ['<head></head> \n ']);
    });

    it('preserves source ranges across character tokens, ignored tags, and fragment EOF', () => {
        const fragment = parseFragment('<p>a &amp;b</bogus> c', { treeAdapter, sourceCodeLocationInfo: true });
        const p = treeAdapter.getFirstChild(fragment);
        const text = treeAdapter.getFirstChild(p);
        assert.deepEqual(treeAdapter.getNodeSourceCodeLocation(text), {
            startLine: 1,
            startCol: 4,
            startOffset: 3,
            endLine: 1,
            endCol: 22,
            endOffset: 21,
        });
    });
});

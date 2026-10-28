import { it, assert } from 'vitest';
import { Parser, type Token } from 'parse5';
import { generateTestsForEachTreeAdapter } from 'parse5-test-utils/utils/common.js';

generateTestsForEachTreeAdapter('Quoted attribute locations', (treeAdapter) => {
    it.each([
        { html: '<g id="a"class="y"></g>', source: 'id="a"', value: 'a' },
        { html: "<g id='a'class='y'></g>", source: "id='a'", value: 'a' },
        { html: '<g id=""class="y"></g>', source: 'id=""', value: '' },
        { html: '<g id="a&amp;b"class="y"></g>', source: 'id="a&amp;b"', value: 'a&b' },
        { html: '<g\r\n id="a\r\nb"class="y"></g>', source: 'id="a\r\nb"', value: 'a\nb' },
        { html: '<g title="😀"id="a"class="y"></g>', source: 'id="a"', value: 'a' },
        { html: '<g id="a"𐀀="y"></g>', source: 'id="a"', value: 'a' },
        { html: '<g id="first"id="later"class="y"></g>', source: 'id="first"', value: 'first' },
        { html: '<g id="a" class="y"></g>', source: 'id="a"', value: 'a' },
        { html: '<g id="a"></g>', source: 'id="a"', value: 'a' },
        { html: '<g id="a"/>', source: 'id="a"', value: 'a' },
    ])('includes the full quoted value in $html', ({ html, source, value }) => {
        for (const chunks of [[html], [...html]]) {
            const errors: Token.Location[] = [];
            const parser = Parser.getFragmentParser(null, {
                treeAdapter,
                sourceCodeLocationInfo: true,
                onParseError(error) {
                    if (error.code === 'missing-whitespace-between-attributes') errors.push(error);
                },
            });
            for (const [index, chunk] of chunks.entries()) {
                parser.tokenizer.write(chunk, index === chunks.length - 1);
            }

            const element = treeAdapter.getChildNodes(parser.getFragment())[0];
            assert.ok(treeAdapter.isElementNode(element));
            assert.strictEqual(treeAdapter.getAttrList(element).find(({ name }) => name === 'id')?.value, value);

            const location = treeAdapter.getNodeSourceCodeLocation(element)?.attrs?.['id'];
            assert.ok(location);
            assert.strictEqual(html.slice(location.startOffset, location.endOffset), source);

            const startOffset = html.indexOf(source);
            const beforeStart = html.slice(0, startOffset).split(/\r\n|[\r\n]/);
            const beforeEnd = html.slice(0, startOffset + source.length).split(/\r\n|[\r\n]/);
            assert.deepStrictEqual(location, {
                startLine: beforeStart.length,
                startCol: beforeStart.at(-1)!.length + 1,
                startOffset,
                endLine: beforeEnd.length,
                endCol: beforeEnd.at(-1)!.length + 1,
                endOffset: startOffset + source.length,
            });

            if (!/[\s/>]/.test(html[startOffset + source.length])) {
                assert.ok(errors.length > 0);
                const following = treeAdapter.getAttrList(element).at(-1)!;
                const followingLocation = treeAdapter.getNodeSourceCodeLocation(element)?.attrs?.[following.name];
                assert.ok(followingLocation);
                assert.strictEqual(following.value, 'y');
                const followingSource = html.slice(followingLocation.startOffset, followingLocation.endOffset);
                assert.ok(followingSource.startsWith(`${following.name}=`));
                assert.match(followingSource, /=["']y["']$/);
            }
        }
    });
});

import * as assert from 'node:assert';
import * as parse5 from 'parse5';
import outdent from 'outdent';
import { generateSerializerTests } from 'parse5-test-utils/utils/generate-serializer-tests.js';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';
import { type Element, isElementNode } from 'parse5/dist/tree-adapters/default';

generateSerializerTests('serializer', 'Serializer', parse5.serialize);

describe('serializer', () => {
    describe("Regression - Get text node's parent tagName only if it's an Element node (GH-38)", () => {
        it('serializes correctly', () => {
            const document = parse5.parse('<template>yo<div></div>42</template>');
            const treeAdapter: typeof treeAdapters.default = {
                ...treeAdapters.default,
                getTagName: (element: Element) => {
                    assert.ok(element.tagName);

                    return treeAdapters.default.getTagName(element);
                },
            };

            parse5.serialize(document, { treeAdapter });
        });
    });

    describe('Scripting flag (GH-332)', () => {
        it('should serialize with the scripting flag', () => {
            const document = parse5.parse('&amp;<noscript>&amp;</noscript>');
            expect(parse5.serialize(document, { scriptingEnabled: false })).toBe(
                '<html><head></head><body>&amp;<noscript>&amp;amp;</noscript></body></html>'
            );
            expect(parse5.serialize(document, { scriptingEnabled: true })).toBe(
                '<html><head></head><body>&amp;<noscript>&amp;</noscript></body></html>'
            );
        });
    });

    describe('Mixed content (GH-333)', () => {
        it('should serialize mixed content', () => {
            const input = outdent`
              <svg><style>&lt;</style></svg>
              <style>&lt;</style>

              <svg><script>&lt;</script></svg>
              <script>&lt;</script>
            `;
            const document = parse5.parse(input);
            expect(parse5.serialize(document)).toContain(input);
        });
    });

    describe('serializeOuter', () => {
        it('serializes outerHTML correctly', () => {
            const document = parse5.parseFragment('<div><button>Hello</button></div>');
            const div = document.childNodes[0];
            assert.ok(isElementNode(div));
            const html = parse5.serializeOuter(div);

            assert.equal(html, '<div><button>Hello</button></div>');
        });
    });
});

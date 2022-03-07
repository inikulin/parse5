import * as assert from 'node:assert';
import * as parse5 from 'parse5';
import { generateSerializerTests } from 'parse5-test-utils/utils/generate-serializer-tests.js';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';
import { type Element, isElementNode } from 'parse5/dist/tree-adapters/default';
import { NAMESPACES } from 'parse5/dist/common/html.js';

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

    describe('serializeOuter', () => {
        it('serializes outerHTML correctly', () => {
            const document = parse5.parseFragment('<div><button>Hello</button></div>');
            const div = document.childNodes[0];
            assert.ok(isElementNode(div));
            const html = parse5.serializeOuter(div);

            assert.equal(html, '<div><button>Hello</button></div>');
        });
    });

    it('serializes <template> elements inner content', () => {
        const document = parse5.parseFragment('<template><button>Hello</button></template>');
        const template = document.childNodes[0];
        assert.ok(isElementNode(template));
        const html = parse5.serialize(template);

        assert.equal(html, '<button>Hello</button>');
    });

    it('serializes the children of void elements as the empty string (GH-289)', () => {
        const br = treeAdapters.default.createElement('br', NAMESPACES.HTML, []);

        // Add child node to `br`, to make sure they are skipped.
        treeAdapters.default.appendChild(br, treeAdapters.default.createElement('div', NAMESPACES.HTML, []));

        assert.equal(parse5.serialize(br), '');

        // If the namespace is not HTML, the serializer should not skip the children.
        const svgBr = treeAdapters.default.createElement('br', NAMESPACES.SVG, []);
        treeAdapters.default.appendChild(svgBr, treeAdapters.default.createElement('div', NAMESPACES.HTML, []));

        assert.equal(parse5.serialize(svgBr), '<div></div>');
    });
});

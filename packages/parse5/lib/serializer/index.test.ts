import * as assert from 'node:assert';
import { html, parse, parseFragment, serialize, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';
import { generateSerializerTests } from 'parse5-test-utils/utils/generate-serializer-tests.js';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';

generateSerializerTests('serializer', 'Serializer', serialize);

describe('serializer', () => {
    describe("Regression - Get text node's parent tagName only if it's an Element node (GH-38)", () => {
        it('serializes correctly', () => {
            const document = parse('<template>yo<div></div>42</template>');
            const treeAdapter: typeof treeAdapters.default = {
                ...treeAdapters.default,
                getTagName: (element: DefaultTreeAdapterMap['element']) => {
                    assert.ok(element.tagName);

                    return treeAdapters.default.getTagName(element);
                },
            };

            serialize(document, { treeAdapter });
        });
    });

    describe('serializeOuter', () => {
        it('serializes outerHTML correctly', () => {
            const document = parseFragment('<div><button>Hello</button></div>');
            const div = document.childNodes[0];
            assert.ok(treeAdapters.default.isElementNode(div));
            const html = serializeOuter(div);

            assert.equal(html, '<div><button>Hello</button></div>');
        });
    });

    it('serializes <template> elements inner content', () => {
        const document = parseFragment('<template><button>Hello</button></template>');
        const template = document.childNodes[0];
        assert.ok(treeAdapters.default.isElementNode(template));
        const html = serialize(template);

        assert.equal(html, '<button>Hello</button>');
    });

    it('serializes the children of void elements as the empty string (GH-289)', () => {
        const br = treeAdapters.default.createElement('br', html.NS.HTML, []);

        // Add child node to `br`, to make sure they are skipped.
        treeAdapters.default.appendChild(br, treeAdapters.default.createElement('div', html.NS.HTML, []));

        assert.equal(serialize(br), '');

        // If the namespace is not HTML, the serializer should not skip the children.
        const svgBr = treeAdapters.default.createElement('br', html.NS.SVG, []);
        treeAdapters.default.appendChild(svgBr, treeAdapters.default.createElement('div', html.NS.HTML, []));

        assert.equal(serialize(svgBr), '<div></div>');
    });
});

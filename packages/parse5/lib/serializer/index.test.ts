import * as assert from 'node:assert';
import * as parse5 from '../index.js';
import { generateSerializerTests } from 'parse5-test-utils/utils/generate-serializer-tests.js';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';
import type { Element } from '../tree-adapters/default';
import type { TreeAdapter } from '../tree-adapters/interface';

generateSerializerTests('serializer', 'Serializer', parse5.serialize);

describe('serializer', () => {
    describe("Regression - Get text node's parent tagName only if it's an Element node (GH-38)", () => {
        it('serializes correctly', () => {
            const document = parse5.parse('<template>yo<div></div>42</template>');
            const treeAdapter = {
                ...treeAdapters.default,
                getTagName: (element: Element) => {
                    assert.ok(element.tagName);

                    return treeAdapters.default.getTagName(element);
                },
            } as TreeAdapter;

            parse5.serialize(document, { treeAdapter });
        });
    });
});

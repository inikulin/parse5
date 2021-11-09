import * as assert from 'node:assert';
import * as parse5 from '../lib/index.js';
import { generateSerializerTests } from '../../../test/utils/generate-serializer-tests.js';
import { treeAdapters } from '../../../test/utils/common.js';

generateSerializerTests('serializer', 'Serializer', parse5.serialize);

describe('serializer', () => {
    describe("Regression - Get text node's parent tagName only if it's an Element node (GH-38)", () => {
        it('serializes correctly', () => {
            const document = parse5.parse('<template>yo<div></div>42</template>');
            const treeAdapter = {
                ...treeAdapters.default,
                getTagName: (element: any) => {
                    assert.ok(element.tagName);

                    return treeAdapters.default.getTagName(element);
                },
            };

            parse5.serialize(document, { treeAdapter });
        });
    });
});

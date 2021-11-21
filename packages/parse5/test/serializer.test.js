import assert from 'assert';
import * as parse5 from '../lib/index.js';
import { generateSeriliazerTests } from '../../../test/utils/generate-serializer-tests.js';
import { treeAdapters } from '../../../test/utils/common.js';

generateSeriliazerTests('serializer', 'Serializer', parse5.serialize);

suite('serializer', () => {
    suite("Regression - Get text node's parent tagName only if it's an Element node (GH-38)", () => {
        test('serializes correctly', () => {
            const getTagNameOriginal = treeAdapters.default.getTagName;
            treeAdapters.default.getTagName = (element) => {
                assert.ok(element.tagName);

                return getTagNameOriginal.call(treeAdapters.default, element);
            };
            const document = parse5.parse('<template>yo<div></div>42</template>');

            try {
                parse5.serialize(document, { treeAdapter: treeAdapters.default });
            } finally {
                treeAdapters.default.getTagName = getTagNameOriginal;
            }
        });
    });
});

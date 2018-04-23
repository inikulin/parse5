'use strict';

const assert = require('assert');
const parse5 = require('../lib');
const generateSeriliazerTests = require('../../../test/utils/generate-serializer-tests');
const { treeAdapters } = require('../../../test/utils/common');

generateSeriliazerTests(exports, 'Serializer', parse5.serialize);

exports["Regression - Get text node's parent tagName only if it's an Element node (GH-38)"] = {
    test() {
        const document = parse5.parse('<template>yo<div></div>42</template>');
        const originalGetTagName = (this.originalGetTagName = treeAdapters.default.getTagName);

        treeAdapters.default.getTagName = function(element) {
            assert.ok(element.tagName);

            return originalGetTagName(element);
        };

        parse5.serialize(document);
    },

    after() {
        treeAdapters.default.getTagName = this.originalGetTagName;
    }
};

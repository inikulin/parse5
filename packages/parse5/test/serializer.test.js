'use strict';

const assert = require('assert');
const parse5 = require('../lib');
const generateSeriliazerTests = require('../../../test/utils/generate-serializer-tests');
const { treeAdapters, getStringDiffMsg } = require('../../../test/utils/common');

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

exports['Optional custom escaping callback'] = {
    test() {
        const document = parse5.parse('<template attr="${ () => 42 }">${ () => 42 }</template>');
        const serializedResult = parse5.serialize(document, {
            escapeString: function(str, attrMode) {
                return '[' + str + (attrMode ? 'attr]' : 'non-attr]');
            }
        });
        let expected = '<html><head>';
        expected += '<template attr="[${ () => 42 }attr]">[${ () => 42 }non-attr]</template>';
        expected += '</head><body></body></html>';
        assert.ok(serializedResult === expected, getStringDiffMsg(serializedResult, expected));
    }
};

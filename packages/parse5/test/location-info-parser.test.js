'use strict';

const assert = require('assert');
const parse5 = require('../lib');
const generateLocationInfoParserTests = require('../../../test/utils/generate-location-info-parser-tests');
const {
    assertStartTagLocation,
    assertNodeLocation
} = require('../../../test/utils/generate-location-info-parser-tests');
const { generateTestsForEachTreeAdapter } = require('../../../test/utils/common');

generateLocationInfoParserTests(module.exports, 'Parser', (input, opts) => ({
    node: parse5.parse(input, opts)
}));

generateTestsForEachTreeAdapter(module.exports, (_test, treeAdapter) => {
    _test['Regression - Incorrect LocationInfo.endOffset for implicitly closed <p> element (GH-109)'] = function() {
        const html = '<p>1<p class="2">3';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstP = treeAdapter.getChildNodes(fragment)[0];
        const firstPLocation = treeAdapter.getNodeSourceCodeLocation(firstP);

        assert.strictEqual(html.substring(firstPLocation.startOffset, firstPLocation.endOffset), '<p>1');
    };

    _test['Regression - Incorrect LocationInfo.endOffset for element with closing tag (GH-159)'] = function() {
        const html = '<i>1</i>2';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(firstChild);

        assert.strictEqual(html.substring(location.startOffset, location.endOffset), '<i>1</i>');
    };

    _test['Regression - Location info not exposed with parseFragment (GH-82)'] = function() {
        const html = '<html><head></head><body>foo</body></html>';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];

        assert.ok(treeAdapter.getNodeSourceCodeLocation(firstChild));
    };

    _test['Regression - location info mixin error when parsing <template> elements (GH-90)'] = function() {
        const html = '<template>hello</template>';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true
        };

        assert.doesNotThrow(() => {
            parse5.parseFragment(html, opts);
        });
    };

    _test['Regression - location info not attached for empty attributes (GH-96)'] = function() {
        const html = '<div test-attr></div>';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];

        assert.ok(treeAdapter.getNodeSourceCodeLocation(firstChild).attrs['test-attr']);
    };

    _test['Regression - location line incorrect when a character is unconsumed (GH-151)'] = function() {
        const html = [
            '<html><body><script>',
            '  var x = window.scrollY <',
            '      100;',
            '</script>',
            '</body></html>'
        ].join('\n');

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true
        };

        const document = parse5.parse(html, opts);
        const htmlEl = treeAdapter.getChildNodes(document)[0];
        const bodyEl = treeAdapter.getChildNodes(htmlEl)[1];
        const scriptEl = treeAdapter.getChildNodes(bodyEl)[0];
        const scriptLocation = treeAdapter.getNodeSourceCodeLocation(scriptEl);

        assert.strictEqual(treeAdapter.getTagName(scriptEl), 'script');
        assert.equal(scriptLocation.endTag.startLine, 4);
    };

    _test['Regression - location.startTag should be available if end tag is missing (GH-181)'] = function() {
        const html = '<p>test';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);
        const p = treeAdapter.getChildNodes(fragment)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(p);

        assertNodeLocation(location, html, html, [html]);
        assertStartTagLocation(location, html, html, [html]);

        assert.ok(!location.endTag);
    };
});

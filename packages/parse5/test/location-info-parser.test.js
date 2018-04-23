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
            locationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstPLocation = treeAdapter.getChildNodes(fragment)[0].__location;

        assert.strictEqual(html.substring(firstPLocation.startOffset, firstPLocation.endOffset), '<p>1');
    };

    _test['Regression - Incorrect LocationInfo.endOffset for element with closing tag (GH-159)'] = function() {
        const html = '<i>1</i>2';

        const opts = {
            treeAdapter: treeAdapter,
            locationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);
        const location = treeAdapter.getChildNodes(fragment)[0].__location;

        assert.strictEqual(html.substring(location.startOffset, location.endOffset), '<i>1</i>');
    };

    _test['Regression - Location info not exposed with parseFragment (GH-82)'] = function() {
        const html = '<html><head></head><body>foo</body></html>';

        const opts = {
            treeAdapter: treeAdapter,
            locationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);

        assert.ok(treeAdapter.getChildNodes(fragment)[0].__location);
    };

    _test['Regression - location info mixin error when parsing <template> elements (GH-90)'] = function() {
        const html = '<template>hello</template>';

        const opts = {
            treeAdapter: treeAdapter,
            locationInfo: true
        };

        assert.doesNotThrow(() => {
            parse5.parseFragment(html, opts);
        });
    };

    _test['Regression - location info not attached for empty attributes (GH-96)'] = function() {
        const html = '<div test-attr></div>';

        const opts = {
            treeAdapter: treeAdapter,
            locationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);

        assert.ok(treeAdapter.getChildNodes(fragment)[0].__location.attrs['test-attr']);
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
            locationInfo: true
        };

        const document = parse5.parse(html, opts);
        const htmlEl = treeAdapter.getChildNodes(document)[0];
        const bodyEl = treeAdapter.getChildNodes(htmlEl)[1];
        const scriptEl = treeAdapter.getChildNodes(bodyEl)[0];

        assert.strictEqual(treeAdapter.getTagName(scriptEl), 'script');
        assert.equal(scriptEl.__location.endTag.startLine, 4);
    };

    _test['Regression - location.startTag should be available if end tag is missing (GH-181)'] = function() {
        const html = '<p>test';

        const opts = {
            treeAdapter: treeAdapter,
            locationInfo: true
        };

        const fragment = parse5.parseFragment(html, opts);
        const p = treeAdapter.getChildNodes(fragment)[0];

        assertNodeLocation(p, html, html, [html]);
        assertStartTagLocation(p, html, html, [html]);

        assert.ok(!p.__location.endTag);
    };
});

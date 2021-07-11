import assert from 'assert';
import * as parse5 from '../lib/index.js';
import { generateLocationInfoParserTests } from '../../../test/utils/generate-location-info-parser-tests.js';
import { assertStartTagLocation, assertNodeLocation } from '../../../test/utils/generate-location-info-parser-tests.js';
import { generateTestsForEachTreeAdapter, treeAdapters } from '../../../test/utils/common.js';

generateLocationInfoParserTests('location-info-parser', 'Parser', (input, opts) => ({
    node: parse5.parse(input, opts),
}));

generateTestsForEachTreeAdapter('location-info-parser', (_test, treeAdapter) => {
    _test['Regression - Incorrect LocationInfo.endOffset for implicitly closed <p> element (GH-109)'] = function () {
        const html = '<p>1<p class="2">3';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstP = treeAdapter.getChildNodes(fragment)[0];
        const firstPLocation = treeAdapter.getNodeSourceCodeLocation(firstP);

        assert.strictEqual(html.substring(firstPLocation.startOffset, firstPLocation.endOffset), '<p>1');
    };

    _test['Regression - Incorrect LocationInfo.endOffset for element with closing tag (GH-159)'] = function () {
        const html = '<i>1</i>2';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(firstChild);

        assert.strictEqual(html.substring(location.startOffset, location.endOffset), '<i>1</i>');
    };

    _test['Regression - Location info not exposed with parseFragment (GH-82)'] = function () {
        const html = '<html><head></head><body>foo</body></html>';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];

        assert.ok(treeAdapter.getNodeSourceCodeLocation(firstChild));
    };

    _test['Regression - location info mixin error when parsing <template> elements (GH-90)'] = function () {
        const html = '<template>hello</template>';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true,
        };

        assert.doesNotThrow(() => {
            parse5.parseFragment(html, opts);
        });
    };

    _test['Regression - location info not attached for empty attributes (GH-96)'] = function () {
        const html = '<div test-attr></div>';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];

        assert.ok(treeAdapter.getNodeSourceCodeLocation(firstChild).attrs['test-attr']);
    };

    _test['Regression - location line incorrect when a character is unconsumed (GH-151)'] = function () {
        const html = [
            '<html><body><script>',
            '  var x = window.scrollY <',
            '      100;',
            '</script>',
            '</body></html>',
        ].join('\n');

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const document = parse5.parse(html, opts);
        const htmlEl = treeAdapter.getChildNodes(document)[0];
        const bodyEl = treeAdapter.getChildNodes(htmlEl)[1];
        const scriptEl = treeAdapter.getChildNodes(bodyEl)[0];
        const scriptLocation = treeAdapter.getNodeSourceCodeLocation(scriptEl);

        assert.strictEqual(treeAdapter.getTagName(scriptEl), 'script');
        assert.equal(scriptLocation.endTag.startLine, 4);
    };

    _test['Regression - location.startTag should be available if end tag is missing (GH-181)'] = function () {
        const html = '<p>test';

        const opts = {
            treeAdapter: treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const p = treeAdapter.getChildNodes(fragment)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(p);

        assertNodeLocation(location, html, html, [html]);
        assertStartTagLocation(location, html, html, [html]);

        assert.ok(!location.endTag);
    };
});

suite('location-info-parser', () => {
    test('Updating node source code location (GH-314)', () => {
        const sourceCodeLocationSetter = {
            setNodeSourceCodeLocation(node, location) {
                if (location === null) {
                    node.sourceCodeLocation = null;
                } else {
                    node.sourceCodeLocation = {
                        start: {
                            line: location.startLine,
                            column: location.startCol,
                            offset: location.startOffset,
                        },
                        end: {
                            line: location.endLine,
                            column: location.endCol,
                            offset: location.endOffset,
                        },
                    };
                }
            },
            updateNodeSourceCodeLocation(node, endLocation) {
                node.sourceCodeLocation = {
                    start: node.sourceCodeLocation.start,
                    end: {
                        line: endLocation.endLine,
                        column: endLocation.endCol,
                        offset: endLocation.endOffset,
                    },
                };
            },
        };
        const treeAdapter = { ...treeAdapters.default, ...sourceCodeLocationSetter };
        const document = parse5.parse('<!doctype><body>Testing location</body>', {
            treeAdapter,
            sourceCodeLocationInfo: true,
        });
        const [doctype, html] = document.childNodes;
        const [head, body] = html.childNodes;
        const [text] = body.childNodes;

        assert.deepEqual(doctype.sourceCodeLocation, {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 11, offset: 10 },
        });
        assert.strictEqual(html.sourceCodeLocation, null);
        assert.strictEqual(head.sourceCodeLocation, null);
        assert.deepEqual(body.sourceCodeLocation, {
            start: { line: 1, column: 11, offset: 10 },
            end: { line: 1, column: 40, offset: 39 },
        });
        assert.deepEqual(text.sourceCodeLocation, {
            start: { line: 1, column: 17, offset: 16 },
            end: { line: 1, column: 33, offset: 32 },
        });
    });
});

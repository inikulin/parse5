import * as assert from 'node:assert';
import { outdent } from 'outdent';
import * as parse5 from 'parse5';
import {
    generateLocationInfoParserTests,
    assertStartTagLocation,
    assertNodeLocation,
} from 'parse5-test-utils/utils/generate-location-info-parser-tests.js';
import { generateTestsForEachTreeAdapter, treeAdapters } from 'parse5-test-utils/utils/common.js';
import { TreeAdapterTypeMap } from 'parse5/dist/tree-adapters/interface.js';

generateLocationInfoParserTests(
    'location-info-parser',
    'Parser',
    (input: string, opts: parse5.ParserOptions<TreeAdapterTypeMap>) => ({
        node: parse5.parse(input, opts),
    })
);

generateTestsForEachTreeAdapter('location-info-parser', (treeAdapter) => {
    test('Regression - Incorrect LocationInfo.endOffset for implicitly closed <p> element (GH-109)', () => {
        const html = '<p>1<p class="2">3';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstP = treeAdapter.getChildNodes(fragment)[0];
        const firstPLocation = treeAdapter.getNodeSourceCodeLocation(firstP)!;

        assert.strictEqual(html.substring(firstPLocation.startOffset, firstPLocation.endOffset), '<p>1');
    });

    test('Regression - Incorrect LocationInfo.endOffset for element with closing tag (GH-159)', () => {
        const html = '<i>1</i>2';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(firstChild);

        assert.ok(location);
        assert.strictEqual(html.substring(location.startOffset, location.endOffset), '<i>1</i>');
    });

    test('Regression - Location info not exposed with parseFragment (GH-82)', () => {
        const html = '<html><head></head><body>foo</body></html>';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];

        assert.ok(treeAdapter.getNodeSourceCodeLocation(firstChild));
    });

    test('Regression - location info mixin error when parsing <template> elements (GH-90)', () => {
        const html = '<template>hello</template>';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        assert.doesNotThrow(() => {
            parse5.parseFragment(html, opts);
        });
    });

    test('Regression - location info not attached for empty attributes (GH-96)', () => {
        const html = '<div test-attr></div>';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const firstChild = treeAdapter.getChildNodes(fragment)[0];

        assert.ok(treeAdapter.getNodeSourceCodeLocation(firstChild)?.attrs?.['test-attr']);
    });

    test('Regression - location line incorrect when a character is unconsumed (GH-151)', () => {
        const html = outdent`
          <html><body><script>
            var x = window.scrollY <
                100;
          </script>
          </body></html>
        `;

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const document = parse5.parse(html, opts);
        const htmlEl = treeAdapter.getChildNodes(document)[0];
        const bodyEl = treeAdapter.getChildNodes(htmlEl)[1];
        const scriptEl = treeAdapter.getChildNodes(bodyEl)[0];
        const scriptLocation = treeAdapter.getNodeSourceCodeLocation(scriptEl);

        assert.strictEqual(treeAdapter.getTagName(scriptEl), 'script');
        assert.equal(scriptLocation?.endTag?.startLine, 4);
    });

    test('Regression - location.startTag should be available if end tag is missing (GH-181)', () => {
        const html = '<p>test';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parse5.parseFragment(html, opts);
        const p = treeAdapter.getChildNodes(fragment)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(p);

        assert.ok(location);
        assertNodeLocation(location, html, html, [html]);
        assertStartTagLocation(location, html, html, [html]);

        assert.ok(!location.endTag);
    });
});

describe('location-info-parser', () => {
    it('Updating node source code location (GH-314)', () => {
        const sourceCodeLocationSetter = {
            setNodeSourceCodeLocation(node: any, location: any): void {
                node.sourceCodeLocation =
                    location === null
                        ? null
                        : {
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
            },
            updateNodeSourceCodeLocation(node: any, endLocation: any): void {
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
        assert.ok(treeAdapters.default.isElementNode(html));
        const [head, body] = html.childNodes;
        assert.ok(treeAdapters.default.isElementNode(body));
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

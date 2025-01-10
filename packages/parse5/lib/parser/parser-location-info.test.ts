import * as assert from 'node:assert';
import { outdent } from 'outdent';
import {
    type ParserOptions,
    type TreeAdapterTypeMap,
    parse,
    parseFragment,
    type DefaultTreeAdapterMap,
    type Token,
} from 'parse5';
import {
    generateLocationInfoParserTests,
    assertStartTagLocation,
    assertNodeLocation,
} from 'parse5-test-utils/utils/generate-location-info-parser-tests.js';
import { generateTestsForEachTreeAdapter, treeAdapters } from 'parse5-test-utils/utils/common.js';

generateLocationInfoParserTests('location-info-parser', (input: string, opts: ParserOptions<TreeAdapterTypeMap>) => ({
    node: parse(input, opts),
}));

generateTestsForEachTreeAdapter('location-info-parser', (treeAdapter) => {
    test('Regression - Incorrect LocationInfo.endOffset for implicitly closed <p> element (GH-109)', () => {
        const html = '<p>1<p class="2">3';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parseFragment(html, opts);
        const firstP = treeAdapter.getChildNodes(fragment)[0];
        const firstPLocation = treeAdapter.getNodeSourceCodeLocation(firstP);

        assert.ok(firstPLocation);
        assert.strictEqual(html.substring(firstPLocation.startOffset, firstPLocation.endOffset), '<p>1');
    });

    test('Regression - Incorrect LocationInfo.endOffset for element with closing tag (GH-159)', () => {
        const html = '<i>1</i>2';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parseFragment(html, opts);
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

        const fragment = parseFragment(html, opts);
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
            parseFragment(html, opts);
        });
    });

    test('Regression - location info not attached for empty attributes (GH-96)', () => {
        const html = '<div test-attr></div>';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parseFragment(html, opts);
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

        const document = parse(html, opts);
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

        const fragment = parseFragment(html, opts);
        const p = treeAdapter.getChildNodes(fragment)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(p);

        assert.ok(location);
        assertNodeLocation(location, html, html, [html]);
        assertStartTagLocation(location, html, html, [html]);

        assert.ok(!location.endTag);
    });

    test('Regression - location.endTag should be available adjusted SVG elements (GH-352)', () => {
        const html = '<svg><foreignObject></foreignObject></svg>';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parseFragment(html, opts);
        const svg = treeAdapter.getChildNodes(fragment)[0];
        const foreignObject = treeAdapter.getChildNodes(svg)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(foreignObject);

        assert.ok(location && location.startTag && location.endTag);
        assert.strictEqual(
            html.slice(location.startTag.startOffset, location.endTag.endOffset),
            '<foreignObject></foreignObject>',
        );
    });

    test('Regression - Escaped script content has incorrect location info (GH-265)', () => {
        const html = '<script>"<!--";</script>';

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const fragment = parseFragment(html, opts);
        const script = treeAdapter.getChildNodes(fragment)[0];
        const location = treeAdapter.getNodeSourceCodeLocation(script);
        const textLocation = treeAdapter.getNodeSourceCodeLocation(treeAdapter.getChildNodes(script)[0]);

        assert.ok(location && textLocation);
        assertNodeLocation(location, html, html, [html]);
        assertStartTagLocation(location, html, html, [html]);

        assertNodeLocation(textLocation, html.slice(8, 15), html, [html]);
    });

    test("Should use the HTML element's position for BODY, if BODY isn't closed", () => {
        const html = outdent`
          <html>
            <body>
              <p>test</p>
          </html>
          <!-- comment -->
        `;

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const document = parse(html, opts);
        const htmlEl = treeAdapter.getChildNodes(document)[0];
        const bodyEl = treeAdapter.getChildNodes(htmlEl)[1];

        const htmlLocation = treeAdapter.getNodeSourceCodeLocation(htmlEl);
        const bodyLocation = treeAdapter.getNodeSourceCodeLocation(bodyEl);

        assert.ok(htmlLocation?.endTag && bodyLocation);

        // HTML element's end tag's start location should be BODY's end location
        assert.strictEqual(htmlLocation.endTag.startOffset, bodyLocation.endOffset);
        assert.strictEqual(htmlLocation.endTag.startLine, bodyLocation.endLine);
        assert.strictEqual(htmlLocation.endTag.startCol, bodyLocation.endCol);

        // The HTML element's location should not be the location of EOF
        assert.notStrictEqual(htmlLocation.endOffset, html.length);
    });

    test('Should set HTML location to EOF if no end tag is supplied', () => {
        const html = outdent`
          <html>
            <body>
              <p>test</p>
              <!-- comment -->
        `;

        const opts = {
            treeAdapter,
            sourceCodeLocationInfo: true,
        };

        const document = parse(html, opts);
        const htmlEl = treeAdapter.getChildNodes(document)[0];
        const bodyEl = treeAdapter.getChildNodes(htmlEl)[1];

        const htmlLocation = treeAdapter.getNodeSourceCodeLocation(htmlEl);
        const bodyLocation = treeAdapter.getNodeSourceCodeLocation(bodyEl);

        assert.ok(htmlLocation && bodyLocation);
        assert.strictEqual(htmlLocation.endOffset, html.length);
        assert.strictEqual(bodyLocation.endOffset, html.length);
    });
});

describe('location-info-parser', () => {
    it('Updating node source code location (GH-314)', () => {
        const sourceCodeLocationSetter = {
            setNodeSourceCodeLocation(
                node: DefaultTreeAdapterMap['node'],
                location: Token.ElementLocation | null,
            ): void {
                node.sourceCodeLocation =
                    location === null
                        ? null
                        : {
                              startLine: location.startLine * 2,
                              startCol: location.startCol * 2,
                              startOffset: location.startOffset * 2,
                              endLine: location.endLine * 2,
                              endCol: location.endCol * 2,
                              endOffset: location.endOffset * 2,
                          };
            },
            updateNodeSourceCodeLocation(
                node: DefaultTreeAdapterMap['node'],
                endLocation: Token.ElementLocation,
            ): void {
                if (node.sourceCodeLocation) {
                    node.sourceCodeLocation = {
                        ...node.sourceCodeLocation,
                        endLine: endLocation.endLine * 2,
                        endCol: endLocation.endCol * 2,
                        endOffset: endLocation.endOffset * 2,
                    };
                }
            },
        };
        const treeAdapter = { ...treeAdapters.default, ...sourceCodeLocationSetter };
        const document = parse('<!doctype><body>Testing location</body>', {
            treeAdapter,
            sourceCodeLocationInfo: true,
        });
        const [doctype, html] = document.childNodes;
        assert.ok(treeAdapters.default.isElementNode(html));
        const [head, body] = html.childNodes;
        assert.ok(treeAdapters.default.isElementNode(body));
        const [text] = body.childNodes;

        assert.deepEqual(doctype.sourceCodeLocation, {
            startLine: 2,
            startCol: 2,
            startOffset: 0,
            endLine: 2,
            endCol: 22,
            endOffset: 20,
        });
        assert.strictEqual(html.sourceCodeLocation, null);
        assert.strictEqual(head.sourceCodeLocation, null);
        assert.deepEqual(body.sourceCodeLocation, {
            startLine: 2,
            startCol: 22,
            startOffset: 20,
            endLine: 2,
            endCol: 80,
            endOffset: 78,
        });
        assert.deepEqual(text.sourceCodeLocation, {
            startLine: 2,
            startCol: 34,
            startOffset: 32,
            endLine: 2,
            endCol: 66,
            endOffset: 64,
        });
    });
});

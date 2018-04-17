'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const HTML = require('../../lib/common/html');
const escapeString = require('../../lib/serializer').escapeString;
const parse5 = require('../../lib');
const testUtils = require('../test_utils');

function getFullLocationTestName(test) {
    return ['Location info (Parser) - ', test.name].join('');
}

function walkTree(document, treeAdapter, handler) {
    for (let stack = treeAdapter.getChildNodes(document).slice(); stack.length; ) {
        const node = stack.shift();
        const children = treeAdapter.getChildNodes(node);

        handler(node);

        if (children && children.length) {
            stack = children.concat(stack);
        }
    }
}

function assertLocation(loc, expected, html, lines) {
    //Offsets
    let actual = html.substring(loc.startOffset, loc.endOffset);

    expected = testUtils.removeNewLines(expected);
    actual = testUtils.removeNewLines(actual);

    assert.strictEqual(expected, actual, testUtils.getStringDiffMsg(actual, expected));

    //Line/col
    actual = testUtils.getSubstringByLineCol(lines, loc);
    actual = testUtils.removeNewLines(actual);

    assert.strictEqual(actual, expected, testUtils.getStringDiffMsg(actual, expected));
}

//NOTE: Based on the idea that the serialized fragment starts with the startTag
function assertStartTagLocation(node, serializedNode, html, lines) {
    const length = node.__location.startTag.endOffset - node.__location.startTag.startOffset;
    const expected = serializedNode.substring(0, length);

    assertLocation(node.__location.startTag, expected, html, lines);
}

//NOTE: Based on the idea that the serialized fragment ends with the endTag
function assertEndTagLocation(node, serializedNode, html, lines) {
    const length = node.__location.endTag.endOffset - node.__location.endTag.startOffset;
    const expected = serializedNode.slice(-length);

    assertLocation(node.__location.endTag, expected, html, lines);
}

function assertAttrsLocation(node, serializedNode, html, lines) {
    node.__location.attrs.forEach(attr => {
        const expected = serializedNode.slice(attr.startOffset, attr.endOffset);

        assertLocation(attr, expected, html, lines);
    });
}

function assertNodeLocation(node, serializedNode, html, lines) {
    const expected = testUtils.removeNewLines(serializedNode);

    assertLocation(node.__location, expected, html, lines);
}

function loadTestData() {
    const dataDirPath = path.join(__dirname, '../data/location_info');
    const testSetFileDirs = fs.readdirSync(dataDirPath);
    const tests = [];

    testSetFileDirs.forEach(dirName => {
        const dataFilePath = path.join(dataDirPath, dirName, 'data.html');
        const data = fs.readFileSync(dataFilePath).toString();

        tests.push({
            name: dirName,
            data: testUtils.normalizeNewLine(data)
        });
    });

    return tests;
}

testUtils.generateTestsForEachTreeAdapter(module.exports, (_test, treeAdapter) => {
    loadTestData().forEach(test => {
        //NOTE: How it works: we parse document with the location info.
        //Then for each node in the tree we run serializer and compare results with the substring
        //obtained via location info from the expected serialization results.
        _test[getFullLocationTestName(test)] = function() {
            const serializerOpts = { treeAdapter: treeAdapter };
            const html = escapeString(test.data);
            const lines = html.split(/\r?\n/g);

            const parserOpts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

            // NOTE: because of performance use bigger chunks here
            const parsingResult = testUtils.parseChunked(html, parserOpts, 100, 400);
            const document = parsingResult.document;

            walkTree(document, treeAdapter, node => {
                if (node.__location) {
                    const fragment = treeAdapter.createDocumentFragment();

                    treeAdapter.appendChild(fragment, node);

                    const serializedNode = parse5.serialize(fragment, serializerOpts);

                    assertNodeLocation(node, serializedNode, html, lines);

                    if (node.__location.startTag) {
                        assertStartTagLocation(node, serializedNode, html, lines);
                    }

                    if (node.__location.endTag) {
                        assertEndTagLocation(node, serializedNode, html, lines);
                    }

                    if (node.__location.attrs) {
                        assertAttrsLocation(node, serializedNode, html, lines);
                    }
                }
            });
        };
    });

    _test['Regression - location info for the implicitly generated <body>, <html> and <head> (GH-44)'] = function() {
        const html = '</head><div class="test"></div></body></html>';

        const opts = {
            treeAdapter: treeAdapter,
            locationInfo: true
        };

        const document = testUtils.parseChunked(html, opts).document;

        //NOTE: location info for all implicitly generated elements should be null
        walkTree(document, treeAdapter, node => {
            if (treeAdapter.getTagName(node) !== HTML.TAG_NAMES.DIV) {
                assert.strictEqual(node.__location, null);
            }
        });
    };

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
            '<html><body>',
            '<script>',
            '  var x = window.scrollY <',
            '      100;',
            '</script>',
            '</body></html>'
        ].join('\n');

        const opts = {
            treeAdapter: treeAdapter,
            locationInfo: true
        };

        const doc = parse5.parse(html, opts);
        let foundScript = false;

        walkTree(doc, treeAdapter, node => {
            if (treeAdapter.getTagName(node) === HTML.TAG_NAMES.SCRIPT) {
                foundScript = true;
                assert.equal(node.__location.endTag.startLine, 5);
            }
        });

        assert.ok(foundScript);
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

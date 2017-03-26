'use strict';

var assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    HTML = require('../../lib/common/html'),
    escapeString = require('../../lib/serializer').escapeString,
    parse5 = require('../../lib'),
    testUtils = require('../test_utils');

function getFullLocationTestName(test) {
    return ['Location info (Parser) - ', test.name].join('');
}

function walkTree(document, treeAdapter, handler) {
    for (var stack = treeAdapter.getChildNodes(document).slice(); stack.length;) {
        var node = stack.shift(),
            children = treeAdapter.getChildNodes(node);

        handler(node);

        if (children && children.length)
            stack = children.concat(stack);
    }
}

function assertLocation(loc, expected, html, lines) {
    //Offsets
    var actual = html.substring(loc.startOffset, loc.endOffset);

    expected = testUtils.removeNewLines(expected);
    actual = testUtils.removeNewLines(actual);

    assert.strictEqual(expected, actual, testUtils.getStringDiffMsg(actual, expected));

    //Line/col
    actual = testUtils.getSubstringByLineCol(lines, loc.startLine, loc.startCol);
    actual = testUtils.removeNewLines(actual);

    assert.strictEqual(actual.indexOf(expected), 0, testUtils.getStringDiffMsg(actual, expected));
}

//NOTE: Based on the idea that the serialized fragment starts with the startTag
function assertStartTagLocation(node, serializedNode, html, lines) {
    var length = node.__location.startTag.endOffset - node.__location.startTag.startOffset,
        expected = serializedNode.substring(0, length);

    assertLocation(node.__location.startTag, expected, html, lines);
}

//NOTE: Based on the idea that the serialized fragment ends with the endTag
function assertEndTagLocation(node, serializedNode, html, lines) {
    var length = node.__location.endTag.endOffset - node.__location.endTag.startOffset,
        expected = serializedNode.slice(-length);

    assertLocation(node.__location.endTag, expected, html, lines);
}

function assertAttrsLocation(node, serializedNode, html, lines) {
    node.__location.attrs.forEach(function (attr) {
        var expected = serializedNode.slice(attr.startOffset, attr.endOffset);

        assertLocation(attr, expected, html, lines);
    });
}

function assertNodeLocation(node, serializedNode, html, lines) {
    var expected = testUtils.removeNewLines(serializedNode);

    assertLocation(node.__location, expected, html, lines);
}

function loadTestData() {
    var dataDirPath = path.join(__dirname, '../data/location_info'),
        testSetFileDirs = fs.readdirSync(dataDirPath),
        tests = [];

    testSetFileDirs.forEach(function (dirName) {
        var dataFilePath = path.join(dataDirPath, dirName, 'data.html'),
            data = fs.readFileSync(dataFilePath).toString();

        tests.push({
            name: dirName,
            data: testUtils.normalizeNewLine(data)
        });
    });

    return tests;
}

testUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, treeAdapter) {
    loadTestData()
        .forEach(function (test) {
            //NOTE: How it works: we parse document with the location info.
            //Then for each node in the tree we run serializer and compare results with the substring
            //obtained via location info from the expected serialization results.
            _test[getFullLocationTestName(test)] = function () {
                var serializerOpts = {
                        treeAdapter: treeAdapter
                    },
                    html = escapeString(test.data),
                    lines = html.split(/\r?\n/g),
                    parserOpts = {
                        treeAdapter: treeAdapter,
                        locationInfo: true
                    };

                // NOTE: because of performance use bigger chunks here
                var parsingResult = testUtils.parseChunked(html, parserOpts, 100, 400),
                    document = parsingResult.document;

                walkTree(document, treeAdapter, function (node) {
                    if (node.__location) {
                        var fragment = treeAdapter.createDocumentFragment();

                        treeAdapter.appendChild(fragment, node);

                        var serializedNode = parse5.serialize(fragment, serializerOpts);

                        assertNodeLocation(node, serializedNode, html, lines);

                        if (node.__location.startTag)
                            assertStartTagLocation(node, serializedNode, html, lines);

                        if (node.__location.endTag)
                            assertEndTagLocation(node, serializedNode, html, lines);

                        if (node.__location.attrs)
                            assertAttrsLocation(node, serializedNode, html, lines);
                    }
                });
            };
        });

    exports['Regression - location info for the implicitly generated <body>, <html> and <head> (GH-44)'] = function () {
        var html = '</head><div class="test"></div></body></html>',
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

        var document = testUtils.parseChunked(html, opts).document;

        //NOTE: location info for all implicitly generated elements should be null
        walkTree(document, treeAdapter, function (node) {
            if (treeAdapter.getTagName(node) !== HTML.TAG_NAMES.DIV)
                assert.strictEqual(node.__location, null);
        });
    };

    exports['Regression - Incorrect LocationInfo.endOffset for implicitly closed <p> element (GH-109)'] = function () {
        var html = '<p>1<p class="2">3',
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

        var fragment = parse5.parseFragment(html, opts),
            firstPLocation = fragment.childNodes[0].__location;

        assert.strictEqual(html.substring(firstPLocation.startOffset, firstPLocation.endOffset), '<p>1');
    };

    exports['Regression - Incorrect LocationInfo.endOffset for element with closing tag (GH-159)'] = function () {
        var html = '<i>1</i>2',
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

        var fragment = parse5.parseFragment(html, opts),
            location = fragment.childNodes[0].__location;

        assert.strictEqual(html.substring(location.startOffset, location.endOffset), '<i>1</i>');
    };

    exports['Regression - Location info not exposed with parseFragment (GH-82)'] = function () {
        var html = '<html><head></head><body>foo</body></html>',
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

        var fragment = parse5.parseFragment(html, opts);

        assert.ok(fragment.childNodes[0].__location);
    };

    exports['Regression - location info mixin error when parsing <template> elements (GH-90)'] = function () {
        var html = '<template>hello</template>',
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

        assert.doesNotThrow(function () {
            parse5.parseFragment(html, opts);
        });
    };

    exports['Regression - location info not attached for empty attributes (GH-96)'] = function () {
        var html = '<div test-attr></div>',
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

        var fragment = parse5.parseFragment(html, opts);

        assert.ok(fragment.childNodes[0].__location.attrs['test-attr']);
    };

    exports['Regression - location line incorrect when a character is unconsumed (GH-151)'] = function () {
        var html = ['<html><body>',
                '<script>',
                '  var x = window.scrollY <',
                '      100;',
                '</script>',
                '</body></html>'].join('\n'),
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

        var doc = parse5.parse(html, opts),
            foundScript = false;

        walkTree(doc, treeAdapter, function (node) {
            if (node.name === 'script') {
                foundScript = true;
                assert.equal(node.__location.endTag.startLine, 5);
            }
        });

        assert.ok(foundScript);
    };

    exports['Regression - location.startTag should be available if end tag is missing (GH-181)'] = function () {
        var html = '<p>test',
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true
            };

        var fragment = parse5.parseFragment(html, opts),
            p = fragment.childNodes[0];

        assertNodeLocation(p, html, html, [html]);
        assertStartTagLocation(p, html, html, [html]);

        assert.ok(!p.__location.endTag);
    };
});

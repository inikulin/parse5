'use strict';

var assert = require('assert'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    escapeString = require('../../lib/serializer').escapeString,
    parse5 = require('../../lib'),
    testUtils = require('../test_utils');

function getFullLocationTestName(test) {
    return ['Location info (Parser) - ', test.name].join('');
}

function walkTree(document, treeAdapter, handler) {
    for (var stack = treeAdapter.getChildNodes(document).slice(); stack.length; ) {
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
    actual = testUtils.getSubstringByLineCol(lines, loc.line, loc.col);
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

function assertNodeLocation(node, serializedNode, html, lines) {
    var expected = testUtils.removeNewLines(serializedNode);

    assertLocation(node.__location, expected, html, lines);
}

testUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, treeAdapter) {
    testUtils
        .loadSerializationTestData(path.join(__dirname, '../data/serialization'))
        .forEach(function (test) {
            //NOTE: How it works: we parse document with the location info.
            //Then for each node in the tree we run serializer and compare results with the substring
            //obtained via location info from the expected serialization results.
            _test[getFullLocationTestName(test)] = function () {
                var serializerOpts = {
                        treeAdapter: treeAdapter
                    },
                    html = escapeString(test.expected),
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
                    }
                });
            };
        });

    exports['Regression - location info for the implicitly generated <body>, <html> and <head> (GH-44)'] = function () {
        var html = '</head><div class="test"></div></body></html>',
            opts = {
                treeAdapter: treeAdapter,
                locationInfo: true,
                decodeHtmlEntities: false
            };

        var document = testUtils.parseChunked(html, opts).document;

        //NOTE: location info for all implicitly generated elements should be null
        walkTree(document, treeAdapter, function (node) {
            if (treeAdapter.getTagName(node) !== HTML.TAG_NAMES.DIV)
                assert.strictEqual(node.__location, null);
        });
    };
});

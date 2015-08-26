'use strict';

var assert = require('assert'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
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

//NOTE: Based on the idea that the serialized fragment starts with the startTag
function assertStartTagLocation(node, serializedNode, html) {
    var length = node.__location.startTag.end - node.__location.startTag.start,
        expectedStartTag = serializedNode.substring(0, length),
        actualStartTag = html.substring(node.__location.startTag.start, node.__location.startTag.end);

    expectedStartTag = testUtils.removeNewLines(expectedStartTag);
    actualStartTag = testUtils.removeNewLines(actualStartTag);

    assert.ok(expectedStartTag === actualStartTag, testUtils.getStringDiffMsg(actualStartTag, expectedStartTag));
}

//NOTE: Based on the idea that the serialized fragment ends with the endTag
function assertEndTagLocation(node, serializedNode, html) {
    var length = node.__location.endTag.end - node.__location.endTag.start,
        expectedEndTag = serializedNode.slice(-length),
        actualEndTag = html.substring(node.__location.endTag.start, node.__location.endTag.end);

    expectedEndTag = testUtils.removeNewLines(expectedEndTag);
    actualEndTag = testUtils.removeNewLines(actualEndTag);

    assert.ok(expectedEndTag === actualEndTag, testUtils.getStringDiffMsg(actualEndTag, expectedEndTag));
}

function assertNodeLocation(node, serializedNode, html) {
    var actual = html.substring(node.__location.start, node.__location.end),
        expected = testUtils.removeNewLines(serializedNode);

    actual = testUtils.removeNewLines(actual);

    //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
    assert.ok(actual === expected, testUtils.getStringDiffMsg(actual, expected));
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
                        treeAdapter: treeAdapter,
                        encodeHtmlEntities: false
                    },
                    html = test.expected,
                    parserOpts = {
                        treeAdapter: treeAdapter,
                        locationInfo: true,
                        decodeHtmlEntities: false
                    };

                // NOTE: because of performance use bigger chunks here
                var parsingResult = testUtils.parseChunked(html, parserOpts, 100, 400),
                    document = parsingResult.document;

                walkTree(document, treeAdapter, function (node) {
                    if (node.__location) {
                        var fragment = treeAdapter.createDocumentFragment();

                        treeAdapter.appendChild(fragment, node);

                        var serializedNode = parse5.serialize(fragment, serializerOpts);

                        assertNodeLocation(node, serializedNode, html);

                        if (node.__location.startTag)
                            assertStartTagLocation(node, serializedNode, html);

                        if (node.__location.endTag)
                            assertEndTagLocation(node, serializedNode, html);
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

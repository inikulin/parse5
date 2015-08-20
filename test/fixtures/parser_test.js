'use strict';

var assert = require('assert'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    parse5 = require('../../lib'),
    ParserStream = parse5.ParserStream,
    Serializer = parse5.Serializer,
    testUtils = require('../test_utils');


function parseChunked(html, opts, minChunkSize) {
    var parser = new ParserStream(opts),
        chunks = testUtils.makeChunks(html, minChunkSize);

    for (var i = 0; i < chunks.length - 1; i++)
        parser.write(chunks[i]);

    parser.end(chunks[chunks.length - 1]);

    return {
        document: parser.document,
        chunks: chunks
    };
}


testUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, treeAdapter) {
    function getFullTestName(test) {
        return ['Parser(', test.dirName, ') - ', test.idx, '.', test.setName, ' - ', test.input].join('');
    }

    function getFullLocationTestName(test) {
        return ['Parser(Location info) - ', test.name].join('');
    }

    function walkTree(document, handler) {
        for (var stack = treeAdapter.getChildNodes(document).slice(); stack.length;) {
            var node = stack.shift(),
                children = treeAdapter.getChildNodes(node);

            handler(node);

            if (children && children.length)
                stack = children.concat(stack);
        }
    }

    //Here we go..
    testUtils
        .loadTreeConstructionTestData([
            path.join(__dirname, '../data/tree_construction'),
            path.join(__dirname, '../data/tree_construction_regression'),
            path.join(__dirname, '../data/tree_construction_options')
        ], treeAdapter)
        .forEach(function (test) {
            _test[getFullTestName(test)] = function () {
                var opts = {
                        decodeHtmlEntities: !test.disableEntitiesDecoding,
                        treeAdapter: treeAdapter
                    },
                    actual = null,
                    msg = null;

                if (test.fragmentContext) {
                    var fragment = ParserStream.parseFragment(test.input, test.fragmentContext, opts);

                    actual = testUtils.serializeToTestDataFormat(fragment, treeAdapter);
                    msg = testUtils.prettyPrintParserAssertionArgs(actual, test.expected);
                }
                else {
                    var result = parseChunked(test.input, opts);

                    actual = testUtils.serializeToTestDataFormat(result.document, treeAdapter);
                    msg = testUtils.prettyPrintParserAssertionArgs(actual, test.expected, result.chunks);
                }

                assert.strictEqual(actual, test.expected, msg);
            };
        });


    //Location info tests
    testUtils.loadSerializationTestData(path.join(__dirname, '../data/serialization')).forEach(function (test) {
        //NOTE: the idea of this test is the following: we parse document with the location info.
        //Then for each node in the tree we run serializer and compare results with the substring
        //obtained via location info from the expected serialization results.
        _test[getFullLocationTestName(test)] = function () {
            var serializer = new Serializer(treeAdapter, {
                    encodeHtmlEntities: false
                }),
                html = test.expected,
                parsingResult = parseChunked(html, {
                    treeAdapter: treeAdapter,
                    locationInfo: true,
                    decodeHtmlEntities: false
                }, 200),
                document = parsingResult.document;

            //NOTE: Based on the idea that the serialized fragment starts with the startTag
            function assertStartTagLoc(node, serializedNode) {
                if (node.__location.startTag) {
                    var length = node.__location.startTag.end - node.__location.startTag.start,
                        expectedStartTag = serializedNode.substring(0, length),
                        actualStartTag = html.substring(node.__location.startTag.start, node.__location.startTag.end);

                    expectedStartTag = testUtils.removeNewLines(expectedStartTag);
                    actualStartTag = testUtils.removeNewLines(actualStartTag);

                    assert.ok(expectedStartTag === actualStartTag, testUtils.getStringDiffMsg(actualStartTag, expectedStartTag));
                }
            }

            //NOTE: Based on the idea that the serialized fragment ends with the endTag
            function assertEndTagLoc(node, serializedNode) {
                if (node.__location.endTag) {
                    var length = node.__location.endTag.end - node.__location.endTag.start,
                        expectedEndTag = serializedNode.slice(-length),
                        actualEndTag = html.substring(node.__location.endTag.start, node.__location.endTag.end);

                    expectedEndTag = testUtils.removeNewLines(expectedEndTag);
                    actualEndTag = testUtils.removeNewLines(actualEndTag);

                    assert.ok(expectedEndTag === actualEndTag, testUtils.getStringDiffMsg(actualEndTag, expectedEndTag));
                }
            }


            walkTree(document, function (node) {
                if (node.__location !== null) {
                    var fragment = treeAdapter.createDocumentFragment();

                    treeAdapter.appendChild(fragment, node);

                    var serializedNode = serializer.serialize(fragment),
                        actual = html.substring(node.__location.start, node.__location.end);

                    actual = testUtils.removeNewLines(actual);

                    var expected = testUtils.removeNewLines(serializedNode);

                    //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
                    assert.ok(actual === expected, testUtils.getStringDiffMsg(actual, expected));

                    assertStartTagLoc(node, serializedNode);
                    assertEndTagLoc(node, serializedNode);
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

        var document = parseChunked(html, opts).document;

        //NOTE: location info for all implicitly generated elements should be null
        walkTree(document, function (node) {
            if (treeAdapter.getTagName(node) !== HTML.TAG_NAMES.DIV)
                assert.strictEqual(node.__location, null);
        });
    };
});


exports['Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)'] = function () {
    var html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>',
        result = parseChunked(html, {treeAdapter: parse5.TreeAdapters.htmlparser2});

    assert.strictEqual(result.document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
};

//TODO test document.write and events


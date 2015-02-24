var assert = require('assert'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    parse5 = require('../../index'),
    Parser = parse5.Parser,
    Serializer = parse5.Serializer,
    TestUtils = require('../test_utils');


TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, treeAdapter) {
    function getFullTestName(test) {
        return ['Parser(', test.dirName, ') - ', test.idx, '.', test.setName, ' - ', test.input].join('');
    }

    function getLocationFullTestName(test) {
        return ['Parser(Location info) - ', test.name].join('');
    }

    //Here we go..
    TestUtils.loadTreeConstructionTestData([
        path.join(__dirname, '../data/tree_construction'),
        path.join(__dirname, '../data/tree_construction_regression'),
        path.join(__dirname, '../data/tree_construction_options')
    ], treeAdapter).forEach(function (test) {
        _test[getFullTestName(test)] = function () {
            var parser = new Parser(treeAdapter, {
                    decodeHtmlEntities: !test.disableEntitiesDecoding
                }),
                result = test.fragmentContext ?
                         parser.parseFragment(test.input, test.fragmentContext) :
                         parser.parse(test.input),
                actual = TestUtils.serializeToTestDataFormat(result, treeAdapter),
                msg = TestUtils.prettyPrintParserAssertionArgs(actual, test.expected);

            assert.strictEqual(actual, test.expected, msg);
        };
    });


    //Location info tests
    TestUtils.loadSerializationTestData(path.join(__dirname, '../data/serialization')).forEach(function (test) {
        //NOTE: the idea of this test is the following: we parse document with the location info.
        //Then for each node in the tree we run serializer and compare results with the substring
        //obtained via location info from the expected serialization results.
        _test[getLocationFullTestName(test)] = function () {
            var parser = new Parser(treeAdapter, {
                    locationInfo: true,
                    decodeHtmlEntities: false
                }),
                serializer = new Serializer(treeAdapter, {
                    encodeHtmlEntities: false
                }),
                html = test.expected,
                document = parser.parse(html);

            for (var stack = [document]; stack.length;) {
                var node = stack.shift(),
                    children = treeAdapter.getChildNodes(node);

                if (node !== document && node.__location !== null) {
                    var fragment = treeAdapter.createDocumentFragment();

                    treeAdapter.appendChild(fragment, node);

                    var expected = serializer.serialize(fragment),
                        actual = html.substring(node.__location.start, node.__location.end);

                    expected = TestUtils.removeNewLines(expected);
                    actual = TestUtils.removeNewLines(actual);

                    //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
                    assert.ok(actual === expected, TestUtils.getStringDiffMsg(actual, expected));
                }

                if (children && children.length)
                    stack = children.concat(stack);
            }
        };
    });
});



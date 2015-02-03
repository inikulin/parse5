var assert = require('assert'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    parse5 = require('../../index'),
    TestUtils = require('../test_utils'),
    Parser = parse5.Parser,
    Serializer = parse5.Serializer;

TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {

    _test['Regression - <form> in <template> (GH-40)'] = function () {
        var parser = new Parser(treeAdapter),
            serializer = new Serializer(treeAdapter),
            src = '<template><form><input name="q"></form><div>second</div></template>',
            fragment = parser.parseFragment(src),
            actual = serializer.serialize(fragment);

        assert.strictEqual(actual, src, TestUtils.getStringDiffMsg(actual, src));
    };

    //html5lib test suite
    //------------------------------------------------------------------------------
    function getFullTestName(test) {
        return ['Parser - ', test.idx, '.', test.setName, ' - ', test.input].join('');
    }

    var testDataDir = path.join(__dirname, '../data/tree_construction');

    //Here we go..
    TestUtils.loadTreeConstructionTestData([
        testDataDir
    ], treeAdapter).forEach(function (test) {
        _test[getFullTestName(test)] = function () {
            var parser = new Parser(treeAdapter),
                result = test.fragmentContext ?
                         parser.parseFragment(test.input, test.fragmentContext) :
                         parser.parse(test.input),
                actual = TestUtils.serializeToTestDataFormat(result, treeAdapter),
                msg = TestUtils.prettyPrintParserAssertionArgs(actual, test.expected);

            assert.strictEqual(actual, test.expected, msg);
        };
    });
});


var fs = require('fs'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    Parser = require('../../index').Parser,
    TestUtils = require('../test_utils');

TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
    function getFullTestName(test) {
        return ['Parser - ', test.idx, '.', test.setName, ' - ', test.input].join('');
    }

    var testDataDir = path.join(__dirname, '../data/tree_construction');

    //Here we go..
    TestUtils.loadTreeConstructionTestData([testDataDir], treeAdapter).forEach(function (test) {
        _test[getFullTestName(test)] = function (t) {
            var parser = new Parser(treeAdapter),
                result = test.fragmentContext ?
                    parser.parseFragment(test.input, test.fragmentContext) :
                    parser.parse(test.input),
                actual = TestUtils.serializeToTestDataFormat(result, treeAdapter);

            t.strictEqual(actual, test.expected, TestUtils.prettyPrintParserAssertionArgs(actual, test.expected));
            t.done();
        };
    });
});


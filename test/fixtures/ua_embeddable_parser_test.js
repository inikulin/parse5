var fs = require('fs'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    UAEmbeddableParser = require('../../index').UAEmbeddableParser,
    TestUtils = require('../test_utils');

//TODO Test reentrancy and state guard

TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
    function getFullTestName(test) {
        return ['UAEmbeddaleParser - ', test.idx, '.', test.setName, ' - ', test.input].join('');
    }

    var testDataDir = path.join(__dirname, '../data/tree_construction'),
        scriptedTestDataDir = path.join(__dirname, '../data/scripted_tree_construction');

    //Here we go..
    TestUtils.loadTreeConstructionTestData([testDataDir, scriptedTestDataDir], treeAdapter).forEach(function (test) {
        _test[getFullTestName(test)] = function (t) {
            function assertResult(result) {
                var actual = TestUtils.serializeToTestDataFormat(result, treeAdapter);
                t.strictEqual(actual, test.expected, TestUtils.prettyPrintParserAssertionArgs(actual, test.expected));
                t.done();
            }


            var parser = new UAEmbeddableParser(treeAdapter);

            if (test.fragmentContext) {
                var result = parser.parseInnerHtml(test.input, test.fragmentContext);
                assertResult(result);
            }

            else {
                var parserController = parser.parseDocument(test.input, function (document, scriptElement) {
                    parserController.suspend();

                    //NOTE: test parser suspension in different modes (sync and async).
                    //If we have script then execute it and resume parser asynchronously.
                    //Resume synchronously otherwise
                    var scriptTextNode = treeAdapter.getChildNodes(scriptElement)[0],
                        script = scriptTextNode && treeAdapter.getTextNodeContent(scriptTextNode);

                    //NOTE: don't pollute test runner output by console.log() calls from test scripts
                    if (script && script.trim() && script.indexOf('console.log') === -1) {
                        setTimeout(function () {
                            //NOTE: mock document for script evaluation
                            var document = {
                                write: function (html) {
                                    parserController.documentWrite(html);
                                }
                            };

                            try {
                                eval(script);
                            } catch (err) {
                                //NOTE: ignore broken scripts from test data
                            }

                            parserController.resume();
                        });
                    }

                    else
                        parserController.resume();

                }, assertResult);
            }
        };
    });
});



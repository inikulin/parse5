var parse5 = require('../index'),
    fs = require('fs'),
    path = require('path');


//NOTE: creates test suites for each available tree adapter.
exports.generateTestsForEachTreeAdapter = function (moduleExports, ctor) {
    Object.keys(parse5.TreeAdapters).forEach(function (adapterName) {
        var tests = {},
            adapter = parse5.TreeAdapters[adapterName];

        ctor(tests, adapterName, adapter);

        Object.keys(tests).forEach(function (testName) {
            moduleExports['Tree adapter: ' + adapterName + ' - ' + testName] = tests[testName];
        });
    });
};

exports.readParsingTestData = function (testSetFileNames) {
    var dataDirPath = path.join(__dirname, './data/parsing'),
        testIdx = 0,
        tests = [];

    testSetFileNames = testSetFileNames || fs.readdirSync(dataDirPath);

    testSetFileNames.forEach(function (fileName) {
        var filePath = path.join(dataDirPath, fileName),
            testSet = fs.readFileSync(filePath).toString(),
            setName = fileName.replace('.dat', ''),
            testDescrs = [],
            curDirective = '',
            curDescr = null;

        testSet.split(/\r?\n/).forEach(function (line) {
            if (line === '#data') {
                curDescr = {};
                testDescrs.push(curDescr);
            }

            if (line[0] === '#') {
                curDirective = line;
                curDescr[curDirective] = [];
            }

            else
                curDescr[curDirective].push(line);
        });

        testDescrs.forEach(function (descr) {
            var fragmentContextTagName = descr['#document-fragment'] && descr['#document-fragment'].join('');

            tests.push({
                idx: ++testIdx,
                setName: setName,
                input: descr['#data'].join('\r\n'),
                expected: descr['#document'].join('\n'),
                expectedErrors: descr['#errors'],
                fragmentContext: fragmentContextTagName
            });
        });
    });

    return tests;
};
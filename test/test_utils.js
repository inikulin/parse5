var parse5 = require('../index'),
    fs = require('fs'),
    path = require('path');

function addSlashes(str) {
    return str
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r');
}

function createDiffMarker(markerPosition) {
    var marker = '';

    for (var i = 0; i < markerPosition - 1; i++)
        marker += ' ';

    return marker + '^\n';
}

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

exports.getStringDiffMsg = function (actual, expected) {
    for (var i = 0; i < expected.length; i++) {
        if (actual[i] !== expected[i]) {
            var diffMsg = '\nString differ at index ' + i + '\n';

            var expectedStr = 'Expected: ' + addSlashes(expected.substring(i - 100, i + 1)),
                expectedDiffMarker = createDiffMarker(expectedStr.length);

            diffMsg += expectedStr + addSlashes(expected.substring(i + 1, i + 20)) + '\n' + expectedDiffMarker;

            var actualStr = 'Actual:   ' + addSlashes(actual.substring(i - 100, i + 1)),
                actualDiffMarker = createDiffMarker(actualStr.length);

            diffMsg += actualStr + addSlashes(actual.substring(i + 1, i + 20)) + '\n' + actualDiffMarker;

            return diffMsg;
        }
    }

    return '';
};

exports.removeNewLines = function (str) {
    return str
        .replace(/\r/g, '')
        .replace(/\n/g, '');
};

exports.loadSerializationTestData = function (dataDirPath) {
    var testSetFileDirs = fs.readdirSync(dataDirPath),
        tests = [],
        testIdx = 1;

    testSetFileDirs.forEach(function (dirName) {
        var srcFilePath = path.join(dataDirPath, dirName, 'src.html'),
            expectedFilePath = path.join(dataDirPath, dirName, 'expected.html'),
            src = fs.readFileSync(srcFilePath).toString(),
            expected = fs.readFileSync(expectedFilePath).toString();

        tests.push({
            idx: testIdx,
            name: dirName,
            src: src,
            expected: expected
        });

        testIdx++;
    });

    return tests;
};
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const serializeToDatFileFormat = require('./serialize-to-dat-file-format');
const { generateTestsForEachTreeAdapter } = require('./common');
const parseDatFile = require('../../test/utils/parse-dat-file');

function loadTreeConstructionTestData(dataDirs, treeAdapter) {
    const tests = [];

    dataDirs.forEach(dataDirPath => {
        const testSetFileNames = fs.readdirSync(dataDirPath);
        const dirName = path.basename(dataDirPath);

        testSetFileNames.forEach(fileName => {
            if (path.extname(fileName) !== '.dat') {
                return;
            }

            const filePath = path.join(dataDirPath, fileName);
            const testSet = fs.readFileSync(filePath, 'utf-8');
            const setName = fileName.replace('.dat', '');

            parseDatFile(testSet, treeAdapter).forEach(test => {
                tests.push(
                    Object.assign(test, {
                        idx: tests.length,
                        setName: setName,
                        dirName: dirName
                    })
                );
            });
        });
    });

    return tests;
}

function prettyPrintParserAssertionArgs(actual, expected, chunks) {
    let msg = '\nExpected:\n';

    msg += '-----------------\n';
    msg += expected + '\n';
    msg += '\nActual:\n';
    msg += '-----------------\n';
    msg += actual + '\n';

    if (chunks) {
        msg += 'Chunks:\n';
        msg += JSON.stringify(chunks);
    }

    return msg;
}

function createParsingTest(test, treeAdapter, parse, { withoutErrors }) {
    return async () => {
        const errs = [];

        const opts = {
            scriptingEnabled: test.scriptingEnabled,
            treeAdapter: treeAdapter,

            onParseError: err => {
                let errStr = `(${err.startLine}:${err.startCol}`;

                // NOTE: use ranges for token errors
                if (err.startLine !== err.endLine || err.startCol !== err.endCol) {
                    errStr += `-${err.endLine}:${err.endCol}`;
                }

                errStr += `) ${err.code}`;

                errs.push(errStr);
            }
        };

        const { node, chunks } = await parse(test, opts);
        const actual = serializeToDatFileFormat(node, opts.treeAdapter);
        const msg = prettyPrintParserAssertionArgs(actual, test.expected, chunks);

        assert.strictEqual(actual, test.expected, msg);

        if (!withoutErrors) {
            assert.deepEqual(errs.sort(), test.expectedErrors.sort());
        }
    };
}

module.exports = function generateParsingTests(
    moduleExports,
    prefix,
    {
        skipFragments,
        withoutErrors,
        testSuite = [
            path.join(__dirname, '../data/html5lib-tests/tree-construction'),
            path.join(__dirname, '../data/tree-construction-regression')
        ]
    },
    parse
) {
    generateTestsForEachTreeAdapter(moduleExports, (_test, treeAdapter) => {
        loadTreeConstructionTestData(testSuite, treeAdapter).forEach(test => {
            if (!(test.fragmentContext && skipFragments)) {
                const testName = `${prefix}(${test.dirName}) - ${test.idx}.${test.setName} - \`${test.input}\` (line ${
                    test.lineNum
                })`;

                _test[testName] = createParsingTest(test, treeAdapter, parse, { withoutErrors });
            }
        });
    });
};

module.exports.loadTreeConstructionTestData = loadTreeConstructionTestData;

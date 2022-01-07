import * as fs from 'node:fs';
import * as path from 'node:path';
import assert from 'node:assert';
import { serializeToDatFileFormat } from './serialize-to-dat-file-format.js';
import { generateTestsForEachTreeAdapter } from './common.js';
import { parseDatFile } from '../../test/utils/parse-dat-file.js';

export function loadTreeConstructionTestData(dataDirs, treeAdapter) {
    const tests = [];

    for (const dataDirPath of dataDirs) {
        const testSetFileNames = fs.readdirSync(dataDirPath);
        const dirName = path.basename(dataDirPath);

        for (const fileName of testSetFileNames) {
            if (path.extname(fileName) !== '.dat') {
                continue;
            }

            const filePath = path.join(dataDirPath, fileName);
            const testSet = fs.readFileSync(filePath, 'utf-8');
            const setName = fileName.replace('.dat', '');

            for (const test of parseDatFile(testSet, treeAdapter)) {
                tests.push({
                    ...test,
                    idx: tests.length,
                    setName,
                    dirName,
                });
            }
        }
    }

    return tests;
}

function prettyPrintParserAssertionArgs(actual, expected, chunks) {
    let msg = '\nExpected:\n';

    msg += '-----------------\n';
    msg += `${expected}\n`;
    msg += '\nActual:\n';
    msg += '-----------------\n';
    msg += `${actual}\n`;

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
            treeAdapter,

            onParseError: (err) => {
                let errStr = `(${err.startLine}:${err.startCol}`;

                // NOTE: use ranges for token errors
                if (err.startLine !== err.endLine || err.startCol !== err.endCol) {
                    errStr += `-${err.endLine}:${err.endCol}`;
                }

                errStr += `) ${err.code}`;

                errs.push(errStr);
            },
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

const treePath = new URL('../data/html5lib-tests/tree-construction', import.meta.url);
const treeRegressionPath = new URL('../data/tree-construction-regression', import.meta.url);

export function generateParsingTests(
    name,
    prefix,
    { skipFragments, withoutErrors, testSuite = [treePath.pathname, treeRegressionPath.pathname] },
    parse
) {
    generateTestsForEachTreeAdapter(name, (_test, treeAdapter) => {
        for (const test of loadTreeConstructionTestData(testSuite, treeAdapter)) {
            if (!(test.fragmentContext && skipFragments)) {
                const testName = `${prefix}(${test.dirName}) - ${test.idx}.${test.setName} - \`${test.input}\` (line ${test.lineNum})`;

                _test[testName] = createParsingTest(test, treeAdapter, parse, { withoutErrors });
            }
        }
    });
}

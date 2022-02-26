import { ParserOptions } from 'parse5';
import { ParserError } from 'parse5/dist/common/error-codes.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as assert from 'node:assert';
import { serializeToDatFileFormat } from './serialize-to-dat-file-format.js';
import { generateTestsForEachTreeAdapter } from './common.js';
import { parseDatFile, DatFile } from './parse-dat-file.js';
import type { TreeAdapter, TreeAdapterTypeMap } from 'parse5/dist/tree-adapters/interface.js';

export interface TreeConstructionTestData<T extends TreeAdapterTypeMap> extends DatFile<T> {
    idx: number;
    setName: string;
    dirName: string;
}

export function loadTreeConstructionTestData<T extends TreeAdapterTypeMap>(
    dataDirs: (string | URL)[],
    treeAdapter: TreeAdapter<T>
): TreeConstructionTestData<T>[] {
    const tests: TreeConstructionTestData<T>[] = [];

    for (const dataDir of dataDirs) {
        const dataDirPath = typeof dataDir === 'string' ? dataDir : dataDir.pathname;
        const testSetFileNames = fs.readdirSync(dataDirPath);
        const dirName = path.basename(dataDirPath);

        for (const fileName of testSetFileNames) {
            if (path.extname(fileName) !== '.dat') {
                continue;
            }

            const filePath = path.join(dataDirPath, fileName);
            const testSet = fs.readFileSync(filePath, 'utf8');
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

function prettyPrintParserAssertionArgs(actual: string, expected: string, chunks?: string[]): string {
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

interface ParseMethodOptions<T extends TreeAdapterTypeMap> extends ParserOptions<T> {
    treeAdapter: TreeAdapter<T>;
}

interface ParseResult<T extends TreeAdapterTypeMap> {
    node: T['node'];
    chunks?: string[];
}

type ParseMethod<T extends TreeAdapterTypeMap> = (
    input: TreeConstructionTestData<T>,
    options: ParseMethodOptions<T>
) => ParseResult<T> | Promise<ParseResult<T>>;

function createParsingTest<T extends TreeAdapterTypeMap>(
    test: TreeConstructionTestData<T>,
    treeAdapter: TreeAdapter<T>,
    parse: ParseMethod<T>,
    { withoutErrors }: { withoutErrors?: boolean }
): () => Promise<void> {
    return async (): Promise<void> => {
        const errs: string[] = [];

        const opts = {
            scriptingEnabled: test.scriptingEnabled,
            treeAdapter,

            onParseError: (err: ParserError): void => {
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

        assert.ok(actual === test.expected, msg);

        if (!withoutErrors) {
            assert.deepEqual(errs.sort(), test.expectedErrors.sort());
        }
    };
}

const treePath = new URL('../data/html5lib-tests/tree-construction', import.meta.url);
const treeRegressionPath = new URL('../data/tree-construction-regression', import.meta.url);

export function generateParsingTests(
    name: string,
    prefix: string,
    {
        skipFragments,
        withoutErrors,
        testSuite = [treePath.pathname, treeRegressionPath.pathname],
    }: { skipFragments?: boolean; withoutErrors?: boolean; testSuite?: string[] },
    parse: ParseMethod<TreeAdapterTypeMap>
): void {
    generateTestsForEachTreeAdapter(name, (treeAdapter) => {
        for (const test of loadTreeConstructionTestData(testSuite, treeAdapter).filter(
            (test) => !skipFragments || !test.fragmentContext
        )) {
            it(
                `${prefix}(${test.dirName}) - ${test.idx}.${test.setName} - \`${test.input}\` (line ${test.lineNum})`,
                createParsingTest<TreeAdapterTypeMap>(test, treeAdapter, parse, { withoutErrors })
            );
        }
    });
}

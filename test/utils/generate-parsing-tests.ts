import type { ParserOptions, TreeAdapter, TreeAdapterTypeMap, ParserError } from 'parse5';
import * as fs from 'node:fs';
import path from 'node:path';
import * as assert from 'node:assert';
import { serializeToDatFileFormat } from './serialize-to-dat-file-format.js';
import { generateTestsForEachTreeAdapter } from './common.js';
import { parseDatFile, type DatFile } from './parse-dat-file.js';

export interface TreeConstructionTestData<T extends TreeAdapterTypeMap> extends DatFile<T> {
    idx: number;
    setName: string;
    dirName: string;
}

export function loadTreeConstructionTestData<T extends TreeAdapterTypeMap>(
    dataDir: URL,
    treeAdapter: TreeAdapter<T>,
): TreeConstructionTestData<T>[] {
    const tests: TreeConstructionTestData<T>[] = [];

    const dataDirPath = dataDir.pathname;
    const testSetFileNames = fs.readdirSync(dataDir);
    const dirName = path.basename(dataDirPath);

    for (const fileName of testSetFileNames) {
        if (path.extname(fileName) !== '.dat') {
            continue;
        }

        const filePath = path.join(dataDirPath, fileName);
        const testSet = fs.readFileSync(filePath, 'utf8');
        const setName = fileName.replace('.dat', '');

        for (const [idx, test] of parseDatFile(testSet, treeAdapter).entries()) {
            tests.push({
                ...test,
                idx,
                setName,
                dirName,
            });
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
    options: ParseMethodOptions<T>,
) => ParseResult<T> | Promise<ParseResult<T>>;

function createParsingTest<T extends TreeAdapterTypeMap>(
    test: TreeConstructionTestData<T>,
    treeAdapter: TreeAdapter<T>,
    parse: ParseMethod<T>,
    { withoutErrors, expectError }: { withoutErrors?: boolean; expectError?: boolean } = {},
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
        let sawError = false;

        try {
            assert.ok(actual === test.expected, msg);

            if (!withoutErrors) {
                assert.deepEqual(errs.sort(), test.expectedErrors.sort());
            }
        } catch (error) {
            if (expectError) {
                return;
            }
            sawError = true;

            throw error;
        }

        if (!sawError && expectError) {
            throw new Error(`Expected error but none was thrown`);
        }
    };
}

// TODO: Stop using the fork here.
const treePath = new URL('../data/html5lib-tests-fork/tree-construction', import.meta.url);

export function generateParsingTests(
    name: string,
    prefix: string,
    {
        withoutErrors,
        expectErrors: expectError = [],
        suitePath = treePath,
    }: { withoutErrors?: boolean; expectErrors?: string[]; suitePath?: URL },
    parse: ParseMethod<TreeAdapterTypeMap>,
): void {
    generateTestsForEachTreeAdapter(name, (treeAdapter) => {
        const errorsToExpect = new Set(expectError);

        for (const test of loadTreeConstructionTestData(suitePath, treeAdapter)) {
            const expectError = errorsToExpect.delete(`${test.idx}.${test.setName}`);

            it(
                `${prefix}(${test.dirName}) - ${test.idx}.${test.setName} - \`${test.input}\` (line ${test.lineNum})`,
                createParsingTest<TreeAdapterTypeMap>(test, treeAdapter, parse, {
                    withoutErrors,
                    expectError,
                }),
            );
        }

        if (errorsToExpect.size > 0) {
            throw new Error(`Expected errors were not found: ${[...errorsToExpect].join(', ')}`);
        }
    });
}

import { it, assert } from 'vitest';
import type { ParserOptions, TreeAdapter, TreeAdapterTypeMap, ParserError } from 'parse5';
import * as fs from 'node:fs';
import path from 'node:path';
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

        try {
            assert.ok(actual === test.expected, msg);

            if (!withoutErrors) {
                assert.deepEqual(errs.sort(), test.expectedErrors.sort());
            }
        } catch (error) {
            if (expectError) {
                return;
            }

            throw error;
        }

        if (expectError) {
            throw new Error(`Expected error but none was thrown`);
        }
    };
}

const treePath = new URL('../data/html5lib-tests/tree-construction', import.meta.url);
const regressionPath = new URL('../data/tree-construction-regressions', import.meta.url);
const errorExpectationsPath = new URL('../data/parser-errors/expectations.json', import.meta.url);

export interface ParserErrorExpectation {
    test: [string, [string, string] | null, boolean, boolean];
    errors: string[];
    sources: string[];
}

function getTestIdentity<T extends TreeAdapterTypeMap>(test: DatFile<T>, treeAdapter: TreeAdapter<T>): string {
    const context =
        test.fragmentContext === null
            ? null
            : [treeAdapter.getNamespaceURI(test.fragmentContext), treeAdapter.getTagName(test.fragmentContext)];

    return JSON.stringify([test.input, context, test.scriptingEnabled, test.disableEntitiesDecoding]);
}

export function addParserErrorExpectations<T extends TreeAdapterTypeMap>(
    tests: TreeConstructionTestData<T>[],
    treeAdapter: TreeAdapter<T>,
    { sourceCaseCount, cases }: { sourceCaseCount: number; cases: ParserErrorExpectation[] },
): Set<TreeConstructionTestData<T>> {
    const expectations = new Map<string, ParserErrorExpectation>();
    const sources = new Set<string>();

    for (const entry of cases) {
        const key = JSON.stringify(entry.test);

        if (expectations.has(key)) {
            throw new Error(`Duplicate parser error expectations: ${entry.sources.join(', ')}`);
        }

        for (const source of entry.sources) {
            if (sources.has(source)) {
                throw new Error(`Duplicate parser error source: ${source}`);
            }

            sources.add(source);
        }

        expectations.set(key, entry);
    }

    if (sources.size !== sourceCaseCount) {
        throw new Error(`Expected ${sourceCaseCount} parser error sources, found ${sources.size}`);
    }

    const coveredTests = new Set<TreeConstructionTestData<T>>();
    const unused = new Set(expectations.keys());

    for (const test of tests) {
        const key = getTestIdentity(test, treeAdapter);
        const entry = expectations.get(key);

        if (entry) {
            test.expectedErrors = entry.errors;
            coveredTests.add(test);
            unused.delete(key);
        }
    }

    if (unused.size > 0) {
        const sources = [...unused].flatMap((key) => expectations.get(key)!.sources);
        throw new Error(`Unmatched parser error expectations: ${sources.join(', ')}`);
    }

    return coveredTests;
}

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

        const tests = loadTreeConstructionTestData(suitePath, treeAdapter);
        const isDefaultSuite = suitePath.href === treePath.href;

        if (isDefaultSuite) {
            tests.push(...loadTreeConstructionTestData(regressionPath, treeAdapter));
        }

        // The upstream corpus has additional cases without a parse5 error oracle.
        // An explicit empty error list is still asserted, unlike a missing record.
        const errorTests = isDefaultSuite
            ? addParserErrorExpectations(tests, treeAdapter, JSON.parse(fs.readFileSync(errorExpectationsPath, 'utf8')))
            : new Set(tests);

        for (const test of tests) {
            const expectError = errorsToExpect.delete(`${test.idx}.${test.setName}`);

            it(
                `${prefix}(${test.dirName}) - ${test.idx}.${test.setName} - \`${test.input}\` (line ${test.lineNum})`,
                createParsingTest<TreeAdapterTypeMap>(test, treeAdapter, parse, {
                    withoutErrors: withoutErrors || !errorTests.has(test),
                    expectError,
                }),
            );
        }

        if (errorsToExpect.size > 0) {
            throw new Error(`Expected errors were not found: ${[...errorsToExpect].join(', ')}`);
        }
    });
}

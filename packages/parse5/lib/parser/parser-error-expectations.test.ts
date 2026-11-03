import { describe, expect, it } from 'vitest';
import { defaultTreeAdapter, type DefaultTreeAdapterMap } from 'parse5';
import {
    addParserErrorExpectations,
    type ParserErrorExpectation,
    type TreeConstructionTestData,
} from 'parse5-test-utils/utils/generate-parsing-tests.js';

function makeTest(input: string): TreeConstructionTestData<DefaultTreeAdapterMap> {
    return {
        input,
        expected: '',
        expectedErrors: [],
        disableEntitiesDecoding: false,
        lineNum: 1,
        scriptingEnabled: true,
        fragmentContext: null,
        idx: 0,
        setName: 'test',
        dirName: 'test',
    };
}

function makeEntry(input: string, source = '0.test.dat'): ParserErrorExpectation {
    return { test: [input, null, true, false], errors: [], sources: [source] };
}

describe('parser error expectations', () => {
    it('distinguishes an explicit empty oracle from a missing record', () => {
        const covered = makeTest('covered');
        const treeOnly = makeTest('tree only');
        const errorTests = addParserErrorExpectations([covered, treeOnly], defaultTreeAdapter, {
            sourceCaseCount: 1,
            cases: [makeEntry('covered')],
        });

        expect(errorTests.has(covered)).toBe(true);
        expect(covered.expectedErrors).toEqual([]);
        expect(errorTests.has(treeOnly)).toBe(false);
    });

    it('applies a shared error oracle to every duplicate upstream input', () => {
        const tests = [makeTest('duplicate'), makeTest('duplicate')];
        const entry = makeEntry('duplicate');
        entry.errors = ['(1:1) missing-doctype'];
        entry.sources.push('1.test.dat');
        const errorTests = addParserErrorExpectations(tests, defaultTreeAdapter, {
            sourceCaseCount: 2,
            cases: [entry],
        });

        expect(errorTests.size).toBe(2);
        expect(tests.map((test) => test.expectedErrors)).toEqual([entry.errors, entry.errors]);
    });

    it('rejects duplicate identities instead of choosing one error list', () => {
        expect(() =>
            addParserErrorExpectations([makeTest('duplicate')], defaultTreeAdapter, {
                sourceCaseCount: 2,
                cases: [makeEntry('duplicate'), makeEntry('duplicate', '1.test.dat')],
            }),
        ).toThrow('Duplicate parser error expectations');
    });

    it('rejects duplicate source pointers', () => {
        expect(() =>
            addParserErrorExpectations([makeTest('first'), makeTest('second')], defaultTreeAdapter, {
                sourceCaseCount: 2,
                cases: [makeEntry('first'), makeEntry('second')],
            }),
        ).toThrow('Duplicate parser error source');
    });

    it('rejects a removed record instead of silently dropping error assertions', () => {
        expect(() =>
            addParserErrorExpectations([makeTest('first')], defaultTreeAdapter, {
                sourceCaseCount: 2,
                cases: [makeEntry('first')],
            }),
        ).toThrow('Expected 2 parser error sources, found 1');
    });

    it('rejects an unmatched input or context', () => {
        const entry = makeEntry('input');
        entry.test[1] = ['http://www.w3.org/2000/svg', 'path'];

        expect(() =>
            addParserErrorExpectations([makeTest('input')], defaultTreeAdapter, {
                sourceCaseCount: 1,
                cases: [entry],
            }),
        ).toThrow('Unmatched parser error expectations: 0.test.dat');
    });
});

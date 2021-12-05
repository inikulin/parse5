import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Tokenizer, TokenizerMode, State as TokenizerState } from 'parse5/lib/tokenizer/index.js';
import { makeChunks } from './common.js';
import { TokenType, Token } from 'parse5/lib/common/token.js';

type HtmlLibToken = [string, string | null, ...unknown[]];

export function convertTokenToHtml5Lib(token: Token): HtmlLibToken {
    switch (token.type) {
        case TokenType.CHARACTER:
        case TokenType.NULL_CHARACTER:
        case TokenType.WHITESPACE_CHARACTER:
            return ['Character', token.chars];

        case TokenType.START_TAG: {
            const reformatedAttrs = Object.fromEntries(token.attrs.map(({ name, value }) => [name, value]));
            const startTagEntry: HtmlLibToken = ['StartTag', token.tagName, reformatedAttrs];

            if (token.selfClosing) {
                startTagEntry.push(true);
            }

            return startTagEntry;
        }

        case TokenType.END_TAG:
            // NOTE: parser feedback simulator can produce adjusted SVG
            // tag names for end tag tokens so we need to lower case it
            return ['EndTag', token.tagName.toLowerCase()];

        case TokenType.COMMENT:
            return ['Comment', token.data];

        case TokenType.DOCTYPE:
            return ['DOCTYPE', token.name, token.publicId, token.systemId, !token.forceQuirks];

        default:
            throw new TypeError(`Unrecognized token type: ${token.type}`);
    }
}

interface TokenError {
    code: string;
    line: number;
    col: number;
}

interface TokenSourceData {
    tokens: HtmlLibToken[];
    errors: TokenError[];
}

type TokenSourceCreator = (data: TokenSourceData) => {
    tokenizer: Tokenizer;
    getNextToken: () => Token;
};

function tokenize(
    createTokenSource: TokenSourceCreator,
    chunks: string | string[],
    initialState: Tokenizer['state'],
    lastStartTag: string | null
): TokenSourceData {
    const result: TokenSourceData = { tokens: [], errors: [] };
    const { tokenizer, getNextToken } = createTokenSource(result);
    let token: Token = { type: TokenType.HIBERNATION, location: null };
    let chunkIdx = 0;

    // NOTE: set small waterline for testing purposes
    tokenizer.preprocessor.bufferWaterline = 8;
    tokenizer.state = initialState;

    if (lastStartTag) {
        tokenizer.lastStartTagName = lastStartTag;
    }

    function writeChunk() {
        const chunk = chunks[chunkIdx];

        tokenizer.write(chunk, ++chunkIdx === chunks.length);
    }

    do {
        if (token.type === TokenType.HIBERNATION) {
            writeChunk();
        } else {
            appendTokenEntry(result.tokens, convertTokenToHtml5Lib(token));
        }

        token = getNextToken();
    } while (token.type !== TokenType.EOF);

    // Sort errors by line and column
    result.errors.sort((err1, err2) => err1.line - err2.line || err1.col - err2.col);

    return result;
}

function unicodeUnescape(str: string): string {
    return str.replace(/\\[Uu]\w{4}/g, (match: string) => String.fromCharCode(Number.parseInt(match.slice(2), 16)));
}

function unescapeDescrIO(testDescr: TestDescription): void {
    testDescr.input = unicodeUnescape(testDescr.input);

    for (const tokenEntry of testDescr.output) {
        //NOTE: unescape token tagName (for StartTag and EndTag tokens), comment data (for Comment token),
        //character token data (for Character token).
        if (tokenEntry[1]) {
            tokenEntry[1] = unicodeUnescape(tokenEntry[1]);
        }
    }
}

function appendTokenEntry(result: HtmlLibToken[], tokenEntry: HtmlLibToken): void {
    if (tokenEntry[0] === 'Character') {
        const lastEntry = result[result.length - 1];

        if (lastEntry && lastEntry[0] === 'Character' && lastEntry[1] != null) {
            lastEntry[1] += tokenEntry[1];
            return;
        }
    }

    result.push(tokenEntry);
}

function concatCharacterTokens(tokenEntries: HtmlLibToken[]): HtmlLibToken[] {
    const result: HtmlLibToken[] = [];

    for (const tokenEntry of tokenEntries) appendTokenEntry(result, tokenEntry);

    return result;
}

function getTokenizerSuitableStateName(testDataStateName: string): Tokenizer['state'] {
    const name = testDataStateName.slice(0, -6).replace(' ', '_').toUpperCase();
    const state = TokenizerMode[name as keyof typeof TokenizerMode];

    return state;
}

interface TestDescription {
    initialStates: string[];
    doubleEscaped?: boolean;
    output: HtmlLibToken[];
    description: string;
    input: string;
    lastStartTag: string;
    errors?: string[];
}

interface LoadedTest {
    idx: number;
    setName: string;
    name: string;
    input: string;
    expected: HtmlLibToken[];
    initialState: Tokenizer['state'];
    lastStartTag: string;
    expectedErrors: string[];
}

function loadTests(dataDirPath: string): LoadedTest[] {
    const testSetFileNames = fs.readdirSync(dataDirPath);
    const tests: LoadedTest[] = [];
    let testIdx = 0;

    for (const fileName of testSetFileNames) {
        if (path.extname(fileName) !== '.test') {
            continue;
        }

        const filePath = path.join(dataDirPath, fileName);
        const testSetJson = fs.readFileSync(filePath).toString();
        const testSet = JSON.parse(testSetJson);
        const testDescrs: TestDescription[] = testSet.tests;

        if (!testDescrs) {
            continue;
        }

        const setName = fileName.replace('.test', '');

        for (const descr of testDescrs) {
            if (!descr.initialStates) {
                descr.initialStates = ['Data state'];
            }

            if (descr.doubleEscaped) {
                unescapeDescrIO(descr);
            }

            const expected = descr.output;

            for (const initialState of descr.initialStates) {
                tests.push({
                    idx: ++testIdx,
                    setName,
                    name: descr.description,
                    input: descr.input,
                    expected: concatCharacterTokens(expected),
                    initialState: getTokenizerSuitableStateName(initialState),
                    lastStartTag: descr.lastStartTag,
                    expectedErrors: descr.errors || [],
                });
            }
        }
    }

    return tests;
}

export function generateTokenizationTests(
    _name: string,
    prefix: string,
    testSuite: string,
    createTokenSource: TokenSourceCreator
): void {
    for (const testData of loadTests(testSuite)) {
        const testName = `${prefix} - ${testData.idx}.${testData.setName} - ${testData.name} - Initial state: ${
            TokenizerState[testData.initialState]
        }`;

        it(testName, () => {
            const chunks = makeChunks(testData.input);
            const result = tokenize(
                createTokenSource,
                chunks,
                testData.initialState as TokenizerState,
                testData.lastStartTag
            );

            assert.deepEqual(result.tokens, testData.expected, `Chunks: ${JSON.stringify(chunks)}`);
            assert.deepEqual(result.errors, testData.expectedErrors || []);
        });
    }
}

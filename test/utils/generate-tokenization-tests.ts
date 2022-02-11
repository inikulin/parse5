import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { type Tokenizer, TokenizerMode, type TokenHandler } from 'parse5/dist/tokenizer/index.js';
import { makeChunks } from './common.js';
import type { CommentToken, DoctypeToken, TagToken, CharacterToken } from 'parse5/dist/common/token.js';
import type { ParserError } from 'parse5/dist/common/error-codes.js';

export type HtmlLibToken = [string, string | null, ...unknown[]];

interface TokenError {
    code: string;
    line: number;
    col: number;
}

const TestsWithBrokenErrors: Record<string, TokenError[]> = {
    /*
     * 57.entities has an error that is not part of the test data.
     *
     * TODO: Move this to the test data.
     */
    'Undefined named entity in attribute value ending in semicolon and whose name starts with a known entity name.': [
        { code: 'unknown-named-character-reference', col: 12, line: 1 },
    ],
};

interface TokenSourceData {
    tokens: HtmlLibToken[];
    errors: TokenError[];
}

type TokenSourceCreator = (data: TokenizeHandler) => Tokenizer;

class TokenizeHandler implements TokenSourceData, TokenHandler {
    constructor(private testData: LoadedTest) {}

    private addToken(token: HtmlLibToken): void {
        assert.deepStrictEqual(token, this.testData.expected[this.tokens.length]);

        this.tokens.push(token);
    }

    onComment(token: CommentToken): void {
        this.addToken(['Comment', token.data]);
    }
    onDoctype(token: DoctypeToken): void {
        this.addToken(['DOCTYPE', token.name, token.publicId, token.systemId, !token.forceQuirks]);
    }
    onStartTag(token: TagToken): void {
        const reformatedAttrs = Object.fromEntries(token.attrs.map(({ name, value }) => [name, value]));
        const startTagEntry: HtmlLibToken = ['StartTag', token.tagName, reformatedAttrs];

        if (token.selfClosing) {
            startTagEntry.push(true);
        }

        this.addToken(startTagEntry);
    }
    onEndTag(token: TagToken): void {
        // NOTE: parser feedback simulator can produce adjusted SVG
        // tag names for end tag tokens so we need to lower case it
        this.addToken(['EndTag', token.tagName.toLowerCase()]);
    }
    onEof(): void {
        this.sawEof = true;
    }
    onCharacter(token: CharacterToken): void {
        const lastEntry = this.tokens[this.tokens.length - 1];

        if (lastEntry && lastEntry[0] === 'Character' && lastEntry[1] != null) {
            lastEntry[1] += token.chars;
        } else {
            this.tokens.push(['Character', token.chars]);
        }

        const actual = this.tokens[this.tokens.length - 1];
        const expected = this.testData.expected[this.tokens.length - 1];
        assert.strictEqual('Character', expected[0]);
        assert.ok(typeof actual[1] === 'string');
        assert.ok(expected[1]?.startsWith(actual[1]));
    }
    onNullCharacter(token: CharacterToken): void {
        this.onCharacter(token);
    }
    onWhitespaceCharacter(token: CharacterToken): void {
        this.onCharacter(token);
    }
    onParseError(err: ParserError): void {
        assert.ok(
            this.testData.expectedErrors.some(
                ({ code, line, col }) => code === err.code && line === err.startLine && col === err.startCol
            )
        );

        this.errors.push({
            code: err.code,
            line: err.startLine,
            col: err.startCol,
        });
    }

    public sawEof = false;
    public tokens: HtmlLibToken[] = [];
    public errors: TokenError[] = [];
}

function tokenize(
    createTokenSource: TokenSourceCreator,
    chunks: string | string[],
    testData: LoadedTest
): TokenSourceData {
    const result = new TokenizeHandler(testData);
    const tokenizer = createTokenSource(result);
    let chunkIdx = 0;

    // NOTE: set small waterline for testing purposes
    tokenizer.preprocessor.bufferWaterline = 8;
    tokenizer.state = testData.initialState;

    if (testData.lastStartTag) {
        tokenizer.lastStartTagName = testData.lastStartTag;
    }

    while (!result.sawEof) {
        if (tokenizer.active) {
            tokenizer.getNextToken();
        } else {
            tokenizer.write(chunks[chunkIdx], ++chunkIdx === chunks.length);
        }
    }

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

function getTokenizerSuitableStateName(testDataStateName: string): Tokenizer['state'] {
    const name = testDataStateName.slice(0, -6).replace(' ', '_').toUpperCase();
    return TokenizerMode[name as keyof typeof TokenizerMode];
}

interface TestDescription {
    initialStates: string[];
    doubleEscaped?: boolean;
    output: HtmlLibToken[];
    description: string;
    input: string;
    lastStartTag: string;
    errors?: TokenError[];
}

interface LoadedTest {
    idx: number;
    setName: string;
    name: string;
    input: string;
    expected: HtmlLibToken[];
    initialState: Tokenizer['state'];
    initialStateName: string;
    lastStartTag: string;
    expectedErrors: TokenError[];
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

            for (const initialStateName of descr.initialStates) {
                tests.push({
                    idx: ++testIdx,
                    setName,
                    name: descr.description,
                    input: descr.input,
                    expected,
                    initialState: getTokenizerSuitableStateName(initialStateName),
                    initialStateName,
                    lastStartTag: descr.lastStartTag,
                    expectedErrors: TestsWithBrokenErrors[descr.description]
                        ? TestsWithBrokenErrors[descr.description]
                        : descr.errors || [],
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
        const testName = `${prefix} - ${testData.idx}.${testData.setName} - ${testData.name} - Initial state: ${testData.initialStateName}`;

        it(testName, () => {
            const chunks = makeChunks(testData.input);
            const result = tokenize(createTokenSource, chunks, testData);

            assert.deepEqual(result.tokens, testData.expected, `Chunks: ${JSON.stringify(chunks)}`);
            assert.deepEqual(result.errors, testData.expectedErrors || []);
        });
    }
}

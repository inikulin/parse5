import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Tokenizer } from '../../packages/parse5/lib/tokenizer/index.js';
import { makeChunks } from './common.js';

export function convertTokenToHtml5Lib(token) {
    switch (token.type) {
        case Tokenizer.CHARACTER_TOKEN:
        case Tokenizer.NULL_CHARACTER_TOKEN:
        case Tokenizer.WHITESPACE_CHARACTER_TOKEN:
            return ['Character', token.chars];

        case Tokenizer.START_TAG_TOKEN: {
            const reformatedAttrs = {};

            for (const attr of token.attrs) {
                reformatedAttrs[attr.name] = attr.value;
            }

            const startTagEntry = ['StartTag', token.tagName, reformatedAttrs];

            if (token.selfClosing) {
                startTagEntry.push(true);
            }

            return startTagEntry;
        }

        case Tokenizer.END_TAG_TOKEN:
            // NOTE: parser feedback simulator can produce adjusted SVG
            // tag names for end tag tokens so we need to lower case it
            return ['EndTag', token.tagName.toLowerCase()];

        case Tokenizer.COMMENT_TOKEN:
            return ['Comment', token.data];

        case Tokenizer.DOCTYPE_TOKEN:
            return ['DOCTYPE', token.name, token.publicId, token.systemId, !token.forceQuirks];

        default:
            throw new TypeError(`Unrecognized token type: ${token.type}`);
    }
}

function sortErrors(result) {
    result.errors = result.errors.sort((err1, err2) => {
        const lineDiff = err1.line - err2.line;

        if (lineDiff !== 0) {
            return lineDiff;
        }

        return err1.col - err2.col;
    });
}

function tokenize(createTokenSource, chunks, initialState, lastStartTag) {
    const result = { tokens: [], errors: [] };
    const { tokenizer, getNextToken } = createTokenSource(result);
    let token = { type: Tokenizer.HIBERNATION_TOKEN };
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
        if (token.type === Tokenizer.HIBERNATION_TOKEN) {
            writeChunk();
        } else {
            appendTokenEntry(result.tokens, convertTokenToHtml5Lib(token));
        }

        token = getNextToken();
    } while (token.type !== Tokenizer.EOF_TOKEN);

    sortErrors(result);

    return result;
}

function unicodeUnescape(str) {
    return str.replace(/\\u(\w{4})/gi, (match, chCodeStr) => String.fromCharCode(Number.parseInt(chCodeStr, 16)));
}

function unescapeDescrIO(testDescr) {
    testDescr.input = unicodeUnescape(testDescr.input);

    for (const tokenEntry of testDescr.output) {
        //NOTE: unescape token tagName (for StartTag and EndTag tokens), comment data (for Comment token),
        //character token data (for Character token).
        tokenEntry[1] = unicodeUnescape(tokenEntry[1]);

        //NOTE: unescape token attributes(if we have them).
        if (tokenEntry.length > 2) {
            for (const attrName of Object.keys(tokenEntry)) {
                const attrVal = tokenEntry[attrName];

                delete tokenEntry[attrName];
                tokenEntry[unicodeUnescape(attrName)] = unicodeUnescape(attrVal);
            }
        }
    }
}

function appendTokenEntry(result, tokenEntry) {
    if (tokenEntry[0] === 'Character') {
        const lastEntry = result[result.length - 1];

        if (lastEntry && lastEntry[0] === 'Character') {
            lastEntry[1] += tokenEntry[1];
            return;
        }
    }

    result.push(tokenEntry);
}

function concatCharacterTokens(tokenEntries) {
    const result = [];

    for (const tokenEntry of tokenEntries) {
        appendTokenEntry(result, tokenEntry);
    }

    return result;
}

function getTokenizerSuitableStateName(testDataStateName) {
    return testDataStateName.toUpperCase().replace(/\s/g, '_');
}

function loadTests(dataDirPath) {
    const testSetFileNames = fs.readdirSync(dataDirPath);
    const tests = [];
    let testIdx = 0;

    for (const fileName of testSetFileNames) {
        if (path.extname(fileName) !== '.test') {
            continue;
        }

        const filePath = path.join(dataDirPath, fileName);
        const testSetJson = fs.readFileSync(filePath).toString();
        const testSet = JSON.parse(testSetJson);
        const testDescrs = testSet.tests;

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

            const expected = [];

            for (const tokenEntry of descr.output) {
                if (tokenEntry !== 'ParseError') {
                    expected.push(tokenEntry);
                }
            }

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

export function generateTokenizationTests(name, prefix, testSuite, createTokenSource) {
    for (const testData of loadTests(testSuite)) {
        const testName = `${prefix} - ${testData.idx}.${testData.setName} - ${testData.name} - Initial state: ${testData.initialState}`;

        test(testName, () => {
            const chunks = makeChunks(testData.input);
            const result = tokenize(createTokenSource, chunks, testData.initialState, testData.lastStartTag);

            assert.deepEqual(result.tokens, testData.expected, `Chunks: ${JSON.stringify(chunks)}`);
            assert.deepEqual(result.errors, testData.expectedErrors || []);
        });
    }
}

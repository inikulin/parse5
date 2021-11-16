import { readFile, writeFile } from 'node:fs';
import { promisify } from 'node:util';
import { basename } from 'node:path';
import { Parser } from '../../packages/parse5/lib/parser/index.js';
import { Tokenizer } from '../../packages/parse5/lib/tokenizer/index.js';
import * as defaultTreeAdapter from '../../packages/parse5/lib/tree-adapters/default.js';
import { convertTokenToHtml5Lib } from '../../test/utils/generate-tokenization-tests.js';
import { parseDatFile } from '../../test/utils/parse-dat-file.js';
import { addSlashes } from '../../test/utils/common.js';
import type { Token } from './../../packages/parse5/lib/common/token.js';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

main();

async function main() {
    const convertPromises = process.argv.slice(2).map(async (file) => {
        const content = await readFileAsync(file, 'utf-8');
        const feedbackTestContent = generateParserFeedbackTest(content);
        const feedbackTestFile = `test/data/parser-feedback/${basename(file, '.dat')}.test`;

        await writeFileAsync(feedbackTestFile, feedbackTestContent);
    });

    await Promise.all(convertPromises);
}

function appendToken(dest: Token[], token: Token) {
    if (token.type === Tokenizer.EOF_TOKEN) return;

    if (token.type === Tokenizer.NULL_CHARACTER_TOKEN || token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN) {
        token.type = Tokenizer.CHARACTER_TOKEN;
    }

    if (token.type === Tokenizer.CHARACTER_TOKEN) {
        const lastToken = dest[dest.length - 1];
        if (lastToken?.type === Tokenizer.CHARACTER_TOKEN) {
            lastToken.chars += token.chars;
            return;
        }
    }

    dest.push(token);
}

function collectParserTokens(html: string) {
    const tokens: Token[] = [];
    const parser = new Parser();

    parser._processInputToken = function (token) {
        Parser.prototype._processInputToken.call(this, token);

        // NOTE: Needed to split attributes of duplicate <html> and <body>
        // which are otherwise merged as per tree constructor spec
        if (token.type === Tokenizer.START_TAG_TOKEN) {
            token.attrs = [...token.attrs];
        }

        appendToken(tokens, token);
    };

    parser.parse(html);

    return tokens.map((token) => convertTokenToHtml5Lib(token));
}

function generateParserFeedbackTest(parserTestFile: string) {
    const tests = parseDatFile(parserTestFile, defaultTreeAdapter);

    const feedbackTest = {
        tests: tests
            .filter((test) => !test.fragmentContext) // TODO
            .map(({ input }) => ({
                description: addSlashes(input),
                input,
                output: collectParserTokens(input),
            })),
    };

    return JSON.stringify(feedbackTest, null, 4);
}

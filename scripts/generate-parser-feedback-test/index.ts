import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Parser } from '../../packages/parse5/lib/parser/index.js';
import * as defaultTreeAdapter from '../../packages/parse5/lib/tree-adapters/default.js';
import { convertTokenToHtml5Lib } from '../../test/utils/generate-tokenization-tests.js';
import { parseDatFile } from '../../test/utils/parse-dat-file.js';
import { addSlashes } from '../../test/utils/common.js';
import { TokenType, Token } from '../../packages/parse5/lib/common/token.js';

// eslint-disable-next-line no-console
main().catch(console.error);

function main() {
    const convertPromises = process.argv.slice(2).map(async (file) => {
        const content = await readFile(file, 'utf-8');
        const feedbackTestContent = generateParserFeedbackTest(content);
        const feedbackTestFile = `test/data/parser-feedback/${basename(file, '.dat')}.test`;

        await writeFile(feedbackTestFile, feedbackTestContent);
    });

    return Promise.all(convertPromises);
}

function appendToken(dest: Token[], token: Token) {
    if (token.type === TokenType.EOF) return;

    if (token.type === TokenType.NULL_CHARACTER || token.type === TokenType.WHITESPACE_CHARACTER) {
        token.type = TokenType.CHARACTER;
    }

    if (token.type === TokenType.CHARACTER) {
        const lastToken = dest[dest.length - 1];
        if (lastToken?.type === TokenType.CHARACTER) {
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
        if (token.type === TokenType.START_TAG) {
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

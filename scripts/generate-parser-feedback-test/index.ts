import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Parser } from 'parse5/dist/parser/index.js';
import * as defaultTreeAdapter from 'parse5/dist/tree-adapters/default.js';
import { HtmlLibToken } from 'parse5-test-utils/utils/generate-tokenization-tests.js';
import { parseDatFile } from 'parse5-test-utils/utils/parse-dat-file.js';
import { addSlashes } from 'parse5-test-utils/utils/common.js';
import { TokenType, Token } from 'parse5/dist/common/token.js';
import type { TreeAdapterTypeMap } from 'parse5/dist/tree-adapters/interface.js';

// eslint-disable-next-line no-console
main().catch(console.error);

function main(): Promise<void[]> {
    const convertPromises = process.argv.slice(2).map(async (file) => {
        const content = await readFile(file, 'utf8');
        const feedbackTestContent = generateParserFeedbackTest(content);
        const feedbackTestFile = `test/data/parser-feedback/${basename(file, '.dat')}.test`;

        await writeFile(feedbackTestFile, feedbackTestContent);
    });

    return Promise.all(convertPromises);
}

function appendToken(dest: Token[], token: Token): void {
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

function convertTokenToHtml5Lib(token: Token): HtmlLibToken {
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

function collectParserTokens(html: string): HtmlLibToken[] {
    const tokens: Token[] = [];

    class ExtendedParser<T extends TreeAdapterTypeMap> extends Parser<T> {
        override _processInputToken(token: Token): void {
            super._processInputToken(token);

            // NOTE: Needed to split attributes of duplicate <html> and <body>
            // which are otherwise merged as per tree constructor spec
            if (token.type === TokenType.START_TAG) {
                token.attrs = [...token.attrs];
            }

            appendToken(tokens, token);
        }
    }

    ExtendedParser.parse(html);

    return tokens.map((token) => convertTokenToHtml5Lib(token));
}

function generateParserFeedbackTest(parserTestFile: string): string {
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

import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Parser } from 'parse5/dist/parser/index.js';
import { type DefaultTreeAdapterMap, defaultTreeAdapter } from 'parse5/dist/tree-adapters/default.js';
import { HtmlLibToken } from 'parse5-test-utils/utils/generate-tokenization-tests.js';
import { parseDatFile } from 'parse5-test-utils/utils/parse-dat-file.js';
import { addSlashes } from 'parse5-test-utils/utils/common.js';
import { CharacterToken, CommentToken, DoctypeToken, TagToken } from '../../packages/parse5/dist/common/token.js';
import type { TreeAdapterTypeMap } from '../../packages/parse5/dist/tree-adapters/interface.js';

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

function collectParserTokens(html: string): HtmlLibToken[] {
    const tokens: HtmlLibToken[] = [];

    class ExtendedParser<T extends TreeAdapterTypeMap> extends Parser<T> {
        private isTopLevel = true;
        /**
         * We only want to add tokens once. We guard against recursive calls
         * using the `isTopLevel` flag.
         */
        private guardTopLevel(fn: () => void, getToken: () => HtmlLibToken): void {
            const { isTopLevel } = this;
            this.isTopLevel = false;

            fn();

            if (isTopLevel) {
                this.isTopLevel = true;

                const token = getToken();

                if (token[0] === 'Character') {
                    if (token[1] == null || token[1].length === 0) {
                        return;
                    }

                    const lastToken = tokens[tokens.length - 1];

                    if (lastToken?.[0] === 'Character') {
                        lastToken[1] += token[1];
                        return;
                    }
                }

                tokens.push(token);
            }
        }

        override onComment(token: CommentToken): void {
            this.guardTopLevel(
                () => super.onComment(token),
                () => ['Comment', token.data]
            );
        }
        override onDoctype(token: DoctypeToken): void {
            this.guardTopLevel(
                () => super.onDoctype(token),
                () => ['DOCTYPE', token.name, token.publicId, token.systemId, !token.forceQuirks]
            );
        }
        override onStartTag(token: TagToken): void {
            this.guardTopLevel(
                () => super.onStartTag(token),
                () => {
                    const reformatedAttrs = Object.fromEntries(token.attrs.map(({ name, value }) => [name, value]));
                    const startTagEntry: HtmlLibToken = ['StartTag', token.tagName, reformatedAttrs];

                    if (token.selfClosing) {
                        startTagEntry.push(true);
                    }

                    return startTagEntry;
                }
            );
        }
        override onEndTag(token: TagToken): void {
            this.guardTopLevel(
                () => super.onEndTag(token),
                // NOTE: parser feedback simulator can produce adjusted SVG
                // tag names for end tag tokens so we need to lower case it
                () => ['EndTag', token.tagName.toLowerCase()]
            );
        }
        override onCharacter(token: CharacterToken): void {
            this.guardTopLevel(
                () => super.onCharacter(token),
                () => ['Character', token.chars]
            );
        }
        override onNullCharacter(token: CharacterToken): void {
            this.guardTopLevel(
                () => super.onNullCharacter(token),
                () => ['Character', token.chars]
            );
        }
        override onWhitespaceCharacter(token: CharacterToken): void {
            const { skipNextNewLine } = this;
            const { chars } = token;

            this.guardTopLevel(
                () => super.onWhitespaceCharacter(token),
                () => ['Character', skipNextNewLine && chars.startsWith('\n') ? chars.slice(1) : chars]
            );
        }
    }

    ExtendedParser.parse(html);

    return tokens;
}

function generateParserFeedbackTest(parserTestFile: string): string {
    const tests = parseDatFile<DefaultTreeAdapterMap>(parserTestFile, defaultTreeAdapter);

    const feedbackTest = {
        tests: tests.map(({ input, fragmentContext }) => ({
            fragmentContext: fragmentContext?.tagName ?? null,
            description: addSlashes(input),
            input,
            output: collectParserTokens(input),
        })),
    };

    return JSON.stringify(feedbackTest, null, 4);
}

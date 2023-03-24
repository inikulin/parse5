import * as assert from 'node:assert';
import { Tokenizer, TokenizerMode, type TokenHandler } from './index.js';
import type { Location, EOFToken, CharacterToken, DoctypeToken, TagToken, CommentToken } from '../common/token.js';
import { getSubstringByLineCol, normalizeNewLine } from 'parse5-test-utils/utils/common.js';

/** Receives events and immediately compares them against the expected values. */
class LocationInfoHandler implements TokenHandler {
    public sawEof = false;
    /** All HTML chunks concatenated. */
    private html: string;
    /** The index of the last html chunk. */
    private idx = 0;
    /** All of the lines in the input. */
    private lines: string[];

    constructor(private htmlChunks: string[]) {
        this.html = htmlChunks.join('');
        this.lines = this.html.split(/\r?\n/g);
    }

    private validateLocation(location: Location | null): void {
        assert.ok(location);

        //Offsets
        const actual = this.html.substring(location.startOffset, location.endOffset);
        const chunk = this.htmlChunks[this.idx];

        assert.strictEqual(actual, chunk);

        //Line/col
        const line = getSubstringByLineCol(this.lines, location);
        const expected = normalizeNewLine(chunk);

        assert.strictEqual(line, expected);

        this.idx += 1;
    }

    onComment({ location }: CommentToken): void {
        this.validateLocation(location);
    }
    onDoctype({ location }: DoctypeToken): void {
        this.validateLocation(location);
    }
    onStartTag({ location }: TagToken): void {
        this.validateLocation(location);
    }
    onEndTag({ location }: TagToken): void {
        this.validateLocation(location);
    }
    onCharacter({ location }: CharacterToken): void {
        this.validateLocation(location);
    }
    onNullCharacter({ location }: CharacterToken): void {
        this.validateLocation(location);
    }
    onWhitespaceCharacter({ location }: CharacterToken): void {
        this.validateLocation(location);
    }
    onEof({ location }: EOFToken): void {
        assert.ok(location);
        assert.strictEqual(location.endOffset, location.startOffset);
        assert.strictEqual(location.endOffset, this.html.length);

        assert.strictEqual(this.idx, this.htmlChunks.length);

        this.sawEof = true;
    }
}

it('Location Info (Tokenizer)', () => {
    const testCases = [
        {
            initialMode: TokenizerMode.DATA,
            lastStartTagName: '',
            htmlChunks: [
                '\r\n',
                '<!DOCTYPE html>',
                '\n',
                '<!-- Test -->',
                '\n',
                '<head>',
                '\n   ',
                '<meta charset="utf-8">',
                '<title>',
                '   ',
                'node.js',
                '\u0000',
                '</title>',
                '\n',
                '</head>',
                '\n',
                '<body id="front">',
                '\n',
                '<div id="intro">',
                '\n   ',
                '<p\n>',
                '\n       ',
                'Node.js',
                ' ',
                'is',
                ' ',
                'a',
                '\n       ',
                'platform',
                ' ',
                'built',
                ' ',
                'on',
                '\n       ',
                '<a href="http://code.google.com/p/v8/">',
                '\n       ',
                "Chrome's",
                ' ',
                'JavaScript',
                ' ',
                'runtime',
                '\n       ',
                '</a>',
                '\n',
                '</div>',
                '</body>',
            ],
        },
        {
            initialMode: TokenizerMode.RCDATA,
            lastStartTagName: 'title',
            htmlChunks: ['<div>Test', ' \n   ', 'hey', ' ', 'ya!', '</title>', '<!--Yo-->'],
        },
        {
            initialMode: TokenizerMode.RAWTEXT,
            lastStartTagName: 'style',
            htmlChunks: ['.header{', ' \n   ', 'color:red;', '\n', '}', '</style>', 'Some', ' ', 'text'],
        },
        {
            initialMode: TokenizerMode.SCRIPT_DATA,
            lastStartTagName: 'script',
            htmlChunks: ['var', ' ', 'a=c', ' ', '-', ' ', 'd;', '\n', 'a<--d;', '</script>', '<div>'],
        },
        {
            initialMode: TokenizerMode.PLAINTEXT,
            lastStartTagName: 'plaintext',
            htmlChunks: ['Text', ' \n', 'Test</plaintext><div>'],
        },
        {
            initialMode: TokenizerMode.DATA,
            lastStartTagName: '',
            htmlChunks: [
                '\n',
                '<!-- regular comment -->',
                '<! bogus comment >',
                '<? another bogus comment >',
                '</!yet another bogus comment>',
                '<![CDATA[ cdata as a bogus comment >',
            ],
        },
        {
            initialMode: TokenizerMode.DATA,
            lastStartTagName: '',
            inForeignNode: true,
            htmlChunks: ['<a>', '<![CDATA[ ', 'CDATA', ' ]]>', '<test>', ' <![CDATA[ ]]>\n'],
        },
    ];

    for (const testCase of testCases) {
        const { htmlChunks } = testCase;
        const handler = new LocationInfoHandler(htmlChunks);
        const tokenizer = new Tokenizer({ sourceCodeLocationInfo: true }, handler);

        // NOTE: set small waterline for testing purposes
        tokenizer.preprocessor.bufferWaterline = 8;
        tokenizer.state = testCase.initialMode;
        tokenizer.lastStartTagName = testCase.lastStartTagName;
        tokenizer.inForeignNode = !!testCase.inForeignNode;

        for (let i = 0; i < htmlChunks.length; i++) {
            tokenizer.write(htmlChunks[i], i === htmlChunks.length - 1);
        }

        assert.ok(handler.sawEof);
        assert.ok(!tokenizer.active);
    }
});

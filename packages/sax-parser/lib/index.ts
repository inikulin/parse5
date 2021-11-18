import { Transform } from 'node:stream';
import { Tokenizer } from '@parse5/parse5/lib/tokenizer/index.js';
import { LocationInfoTokenizerMixin } from '@parse5/parse5/lib/extensions/location-info/tokenizer-mixin.js';
import { Mixin } from '@parse5/parse5/lib/utils/mixin.js';
import type {
    Token,
    CharacterToken,
    TagToken,
    DoctypeToken,
    CommentToken,
    Attribute,
    Location,
} from '@parse5/parse5/lib/common/token.js';
import { DevNullStream } from './dev-null-stream.js';
import { ParserFeedbackSimulator } from './parser-feedback-simulator.js';

export interface SAXParserOptions {
    /**
     * Enables source code location information for the tokens.
     * When enabled, each token will have `sourceCodeLocation` property.
     */
    sourceCodeLocationInfo?: boolean;
}

export class SAXParser extends Transform {
    options: SAXParserOptions;
    tokenizer = new Tokenizer();
    parserFeedbackSimulator = new ParserFeedbackSimulator(this.tokenizer);
    pendingText: CharacterToken | null = null;
    lastChunkWritten = false;
    stopped = false;
    protected locInfoMixin: LocationInfoTokenizerMixin | null = null;

    constructor(options: SAXParserOptions = {}) {
        super({ encoding: 'utf8', decodeStrings: false });

        this.options = {
            sourceCodeLocationInfo: false,
            ...options,
        };

        if (this.options.sourceCodeLocationInfo) {
            this.locInfoMixin = Mixin.install(this.tokenizer, LocationInfoTokenizerMixin);
        }

        // NOTE: always pipe stream to the /dev/null stream to avoid
        // `highWaterMark` hit even if we don't have consumers.
        // (see: https://github.com/parse5/parse5-fork/issues/97#issuecomment-171940774)
        this.pipe(new DevNullStream());
    }

    //TransformStream implementation
    override _transform(chunk: string, _encoding: string, callback: (error?: Error | null, data?: string) => void) {
        if (typeof chunk !== 'string') {
            throw new TypeError('Parser can work only with string streams.');
        }

        callback(null, this._transformChunk(chunk));
    }

    override _final(callback: (error?: Error | null, data?: string) => void) {
        this.lastChunkWritten = true;
        callback(null, this._transformChunk(''));
    }

    stop() {
        this.stopped = true;
    }

    //Internals
    _transformChunk(chunk: string) {
        if (!this.stopped) {
            this.tokenizer.write(chunk, this.lastChunkWritten);
            this._runParsingLoop();
        }
        return chunk;
    }

    _runParsingLoop() {
        let token = null;

        do {
            token = this.parserFeedbackSimulator.getNextToken();

            if (token.type === Tokenizer.HIBERNATION_TOKEN) {
                break;
            }

            if (
                token.type === Tokenizer.CHARACTER_TOKEN ||
                token.type === Tokenizer.WHITESPACE_CHARACTER_TOKEN ||
                token.type === Tokenizer.NULL_CHARACTER_TOKEN
            ) {
                if (this.pendingText === null) {
                    token.type = Tokenizer.CHARACTER_TOKEN;
                    this.pendingText = token;
                } else {
                    this.pendingText.chars += token.chars;

                    if (this.options.sourceCodeLocationInfo) {
                        const { endLine, endCol, endOffset } = token.location!;
                        this.pendingText.location = {
                            ...this.pendingText.location!,
                            endLine,
                            endCol,
                            endOffset,
                        };
                    }
                }
            } else {
                this._emitPendingText();
                this._handleToken(token);
            }
        } while (!this.stopped && token.type !== Tokenizer.EOF_TOKEN);
    }

    _handleToken(token: Token) {
        if (token.type === Tokenizer.EOF_TOKEN) {
            return true;
        }

        const { eventName, reshapeToken } = TOKEN_EMISSION_HELPERS[token.type];

        if (this.listenerCount(eventName) === 0) {
            return false;
        }

        this._emitToken(eventName, reshapeToken(token as any));

        return true;
    }

    _emitToken(eventName: string, token: SaxToken) {
        this.emit(eventName, token);
    }

    _emitPendingText() {
        if (this.pendingText !== null) {
            this._handleToken(this.pendingText);
            this.pendingText = null;
        }
    }
}

export interface SaxToken {
    /** Source code location info. Available if location info is enabled via {@link SAXParserOptions}. */
    sourceCodeLocation?: Location | undefined;
}

export interface StartTag extends SaxToken {
    tagName: string;
    attrs: Attribute[];
    selfClosing: boolean;
}

export interface EndTag extends SaxToken {
    tagName: string;
}

export interface Text extends SaxToken {
    text: string;
}

export interface Comment extends SaxToken {
    text: string;
}

export interface Doctype extends SaxToken {
    name: string | null;
    publicId: string | null;
    systemId: string | null;
}

const TEXT_EMISSION_HELPER = {
    eventName: 'text',
    reshapeToken: (origToken: CharacterToken): Text => ({
        text: origToken.chars,
        sourceCodeLocation: origToken.location,
    }),
};

const TOKEN_EMISSION_HELPERS = {
    [Tokenizer.START_TAG_TOKEN]: {
        eventName: 'startTag',
        reshapeToken: (origToken: TagToken): StartTag => ({
            tagName: origToken.tagName,
            attrs: origToken.attrs,
            selfClosing: origToken.selfClosing,
            sourceCodeLocation: origToken.location,
        }),
    },
    [Tokenizer.END_TAG_TOKEN]: {
        eventName: 'endTag',
        reshapeToken: (origToken: TagToken): EndTag => ({
            tagName: origToken.tagName,
            sourceCodeLocation: origToken.location,
        }),
    },
    [Tokenizer.COMMENT_TOKEN]: {
        eventName: 'comment',
        reshapeToken: (origToken: CommentToken) => ({ text: origToken.data, sourceCodeLocation: origToken.location }),
    },
    [Tokenizer.DOCTYPE_TOKEN]: {
        eventName: 'doctype',
        reshapeToken: (origToken: DoctypeToken): Doctype => ({
            name: origToken.name,
            publicId: origToken.publicId,
            systemId: origToken.systemId,
            sourceCodeLocation: origToken.location,
        }),
    },
    [Tokenizer.CHARACTER_TOKEN]: TEXT_EMISSION_HELPER,
    [Tokenizer.NULL_CHARACTER_TOKEN]: TEXT_EMISSION_HELPER,
    [Tokenizer.WHITESPACE_CHARACTER_TOKEN]: TEXT_EMISSION_HELPER,
    [Tokenizer.HIBERNATION_TOKEN]: {
        eventName: 'hibernation',
        reshapeToken: () => ({}),
    },
};

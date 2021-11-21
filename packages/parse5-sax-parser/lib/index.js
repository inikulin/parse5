import { Transform } from 'stream';
import {
    Tokenizer,
    CHARACTER_TOKEN,
    DOCTYPE_TOKEN,
    COMMENT_TOKEN,
    END_TAG_TOKEN,
    START_TAG_TOKEN,
    HIBERNATION_TOKEN,
    WHITESPACE_CHARACTER_TOKEN,
    NULL_CHARACTER_TOKEN,
    EOF_TOKEN,
} from 'parse5/lib/tokenizer/index.js';
import { LocationInfoTokenizerMixin } from 'parse5/lib/extensions/location-info/tokenizer-mixin.js';
import { Mixin, install as installMixin } from 'parse5/lib/utils/mixin.js';
import { DevNullStream } from './dev-null-stream.js';
import { ParserFeedbackSimulator } from './parser-feedback-simulator.js';

const DEFAULT_OPTIONS = {
    sourceCodeLocationInfo: false,
};

export class SAXParser extends Transform {
    constructor(options) {
        super({ encoding: 'utf8', decodeStrings: false });

        this.options = {
            ...DEFAULT_OPTIONS,
            ...options,
        };

        this.tokenizer = new Tokenizer(options);
        this.locInfoMixin = null;

        if (this.options.sourceCodeLocationInfo) {
            this.locInfoMixin = installMixin(this.tokenizer, LocationInfoTokenizerMixin);
        }

        this.parserFeedbackSimulator = new ParserFeedbackSimulator(this.tokenizer);

        this.pendingText = null;

        this.lastChunkWritten = false;
        this.stopped = false;

        // NOTE: always pipe stream to the /dev/null stream to avoid
        // `highWaterMark` hit even if we don't have consumers.
        // (see: https://github.com/inikulin/parse5/issues/97#issuecomment-171940774)
        this.pipe(new DevNullStream());
    }

    //TransformStream implementation
    _transform(chunk, encoding, callback) {
        if (typeof chunk !== 'string') {
            throw new TypeError('Parser can work only with string streams.');
        }

        callback(null, this._transformChunk(chunk));
    }

    _final(callback) {
        this.lastChunkWritten = true;
        callback(null, this._transformChunk(''));
    }

    stop() {
        this.stopped = true;
    }

    //Internals
    _transformChunk(chunk) {
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

            if (token.type === HIBERNATION_TOKEN) {
                break;
            }

            if (
                token.type === CHARACTER_TOKEN ||
                token.type === WHITESPACE_CHARACTER_TOKEN ||
                token.type === NULL_CHARACTER_TOKEN
            ) {
                if (this.pendingText === null) {
                    token.type = CHARACTER_TOKEN;
                    this.pendingText = token;
                } else {
                    this.pendingText.chars += token.chars;

                    if (this.options.sourceCodeLocationInfo) {
                        const { endLine, endCol, endOffset } = token.location;
                        this.pendingText.location = {
                            ...this.pendingText.location,
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
        } while (!this.stopped && token.type !== EOF_TOKEN);
    }

    _handleToken(token) {
        if (token.type === EOF_TOKEN) {
            return true;
        }

        const { eventName, reshapeToken } = TOKEN_EMISSION_HELPERS[token.type];

        if (this.listenerCount(eventName) === 0) {
            return false;
        }

        this._emitToken(eventName, reshapeToken(token));

        return true;
    }

    _emitToken(eventName, token) {
        this.emit(eventName, token);
    }

    _emitPendingText() {
        if (this.pendingText !== null) {
            this._handleToken(this.pendingText);
            this.pendingText = null;
        }
    }
}

const TOKEN_EMISSION_HELPERS = {
    [START_TAG_TOKEN]: {
        eventName: 'startTag',
        reshapeToken: (origToken) => ({
            tagName: origToken.tagName,
            attrs: origToken.attrs,
            selfClosing: origToken.selfClosing,
            sourceCodeLocation: origToken.location,
        }),
    },
    [END_TAG_TOKEN]: {
        eventName: 'endTag',
        reshapeToken: (origToken) => ({ tagName: origToken.tagName, sourceCodeLocation: origToken.location }),
    },
    [COMMENT_TOKEN]: {
        eventName: 'comment',
        reshapeToken: (origToken) => ({ text: origToken.data, sourceCodeLocation: origToken.location }),
    },
    [DOCTYPE_TOKEN]: {
        eventName: 'doctype',
        reshapeToken: (origToken) => ({
            name: origToken.name,
            publicId: origToken.publicId,
            systemId: origToken.systemId,
            sourceCodeLocation: origToken.location,
        }),
    },
    [CHARACTER_TOKEN]: {
        eventName: 'text',
        reshapeToken: (origToken) => ({ text: origToken.chars, sourceCodeLocation: origToken.location }),
    },
};

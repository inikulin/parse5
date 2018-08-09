'use strict';

const { Transform } = require('stream');
const Tokenizer = require('parse5/lib/tokenizer');
const LocationInfoTokenizerMixin = require('parse5/lib/extensions/location-info/tokenizer-mixin');
const Mixin = require('parse5/lib/utils/mixin');
const mergeOptions = require('parse5/lib/utils/merge-options');
const DevNullStream = require('./dev-null-stream');
const ParserFeedbackSimulator = require('./parser-feedback-simulator');

const DEFAULT_OPTIONS = {
    sourceCodeLocationInfo: false
};

class SAXParser extends Transform {
    constructor(options) {
        super();

        this.options = mergeOptions(DEFAULT_OPTIONS, options);

        this.tokenizer = new Tokenizer(options);
        this.locInfoMixin = null;

        if (this.options.sourceCodeLocationInfo) {
            this.locInfoMixin = Mixin.install(this.tokenizer, LocationInfoTokenizerMixin);
        }

        this.parserFeedbackSimulator = new ParserFeedbackSimulator(this.tokenizer);

        this.pendingText = null;
        this.currentTokenLocation = void 0;

        this.lastChunkWritten = false;
        this.stopped = false;

        // NOTE: always pipe stream to the /dev/null stream to avoid
        // `highWaterMark` hit even if we don't have consumers.
        // (see: https://github.com/inikulin/parse5/issues/97#issuecomment-171940774)
        this.pipe(new DevNullStream());
    }

    //TransformStream implementation
    _transform(chunk, encoding, callback) {
        this._parseChunk(chunk);
        this.push(chunk);

        callback();
    }

    _flush(callback) {
        callback();
    }

    end(chunk, encoding, callback) {
        this.lastChunkWritten = true;
        super.end(chunk, encoding, callback);
    }

    stop() {
        this.stopped = true;
    }

    //Internals
    _parseChunk(chunk) {
        if (!this.stopped) {
            this.tokenizer.write(chunk.toString('utf8'), this.lastChunkWritten);
            this._runParsingLoop();
        }
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
                        const { endLine, endCol, endOffset } = token.location;
                        Object.assign(this.pendingText.location, {
                            endLine,
                            endCol,
                            endOffset
                        });
                    }
                }
            } else {
                this._emitPendingText();
                this._handleToken(token);
            }
        } while (!this.stopped && token.type !== Tokenizer.EOF_TOKEN);
    }

    _handleToken(token) {
        if (token.type === Tokenizer.EOF_TOKEN) {
            return true;
        }

        const { eventName, reshapeToken } = TOKEN_EMISSION_HELPERS[token.type];

        if (this.options.sourceCodeLocationInfo) {
            this.currentTokenLocation = token.location;
        }

        if (this.listenerCount(eventName) === 0) {
            return false;
        }

        this._emitToken(eventName, reshapeToken.call(this, token));

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

    // Tokens
    _reshapeStartTagToken(origToken) {
        return {
            tagName: origToken.tagName,
            attrs: origToken.attrs,
            selfClosing: origToken.selfClosing,
            sourceCodeLocation: this.currentTokenLocation
        };
    }

    _reshapeEndTagToken(origToken) {
        return { tagName: origToken.tagName, sourceCodeLocation: this.currentTokenLocation };
    }

    _reshapeCommentToken(origToken) {
        return { text: origToken.data, sourceCodeLocation: this.currentTokenLocation };
    }

    _reshapeDoctypeToken(origToken) {
        return {
            name: origToken.name,
            publicId: origToken.publicId,
            systemId: origToken.systemId,
            sourceCodeLocation: this.currentTokenLocation
        };
    }

    _reshapeCharToken(origToken) {
        return { text: origToken.chars, sourceCodeLocation: this.currentTokenLocation };
    }
}

const TOKEN_EMISSION_HELPERS = {
    [Tokenizer.START_TAG_TOKEN]: {
        eventName: 'startTag',
        reshapeToken: SAXParser.prototype._reshapeStartTagToken
    },
    [Tokenizer.END_TAG_TOKEN]: {
        eventName: 'endTag',
        reshapeToken: SAXParser.prototype._reshapeEndTagToken
    },
    [Tokenizer.COMMENT_TOKEN]: {
        eventName: 'comment',
        reshapeToken: SAXParser.prototype._reshapeCommentToken
    },
    [Tokenizer.DOCTYPE_TOKEN]: {
        eventName: 'doctype',
        reshapeToken: SAXParser.prototype._reshapeDoctypeToken
    },
    [Tokenizer.CHARACTER_TOKEN]: {
        eventName: 'text',
        reshapeToken: SAXParser.prototype._reshapeCharToken
    }
};

module.exports = SAXParser;

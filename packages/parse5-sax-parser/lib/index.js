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
                if (this.options.sourceCodeLocationInfo) {
                    if (this.pendingText === null) {
                        this.currentTokenLocation = token.location;
                    } else {
                        this.currentTokenLocation.endOffset = token.location.endOffset;
                    }
                }

                this.pendingText = (this.pendingText || '') + token.chars;
            } else {
                this._emitPendingText();
                this._handleToken(token);
            }
        } while (!this.stopped && token.type !== Tokenizer.EOF_TOKEN);
    }

    _handleToken(token) {
        if (this.options.sourceCodeLocationInfo) {
            this.currentTokenLocation = token.location;
        }

        if (token.type === Tokenizer.START_TAG_TOKEN) {
            this.emit('startTag', this._reshapeStartTagToken(token));
        } else if (token.type === Tokenizer.END_TAG_TOKEN) {
            this.emit('endTag', this._reshapeEndTagToken(token));
        } else if (token.type === Tokenizer.COMMENT_TOKEN) {
            this.emit('comment', this._reshapeCommentToken(token));
        } else if (token.type === Tokenizer.DOCTYPE_TOKEN) {
            this.emit('doctype', this._reshapeDoctypeToken(token));
        }
    }

    _emitPendingText() {
        if (this.pendingText !== null) {
            this.emit('text', this._createTextToken());
            this.pendingText = null;
        }
    }

    // Tokens
    _createTextToken() {
        return { text: this.pendingText, sourceCodeLocation: this.currentTokenLocation };
    }

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
}

module.exports = SAXParser;

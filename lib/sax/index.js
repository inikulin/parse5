'use strict';

const TransformStream = require('stream').Transform;
const DevNullStream = require('./dev_null_stream');
const Tokenizer = require('../tokenizer');
const LocationInfoTokenizerMixin = require('../extensions/location_info/tokenizer_mixin');
const Mixin = require('../utils/mixin');
const ParserFeedbackSimulator = require('./parser_feedback_simulator');
const mergeOptions = require('../utils/merge_options');

const DEFAULT_OPTIONS = {
    locationInfo: false
};

class SAXParser extends TransformStream {
    constructor(options) {
        super();

        this.options = mergeOptions(DEFAULT_OPTIONS, options);

        this.tokenizer = new Tokenizer(options);

        if (this.options.locationInfo) {
            Mixin.install(this.tokenizer, LocationInfoTokenizerMixin);
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
        if (!this.stopped) {
            this.tokenizer.write(chunk.toString('utf8'), this.lastChunkWritten);
            this._runParsingLoop();
        }

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
                if (this.options.locationInfo) {
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
        if (this.options.locationInfo) {
            this.currentTokenLocation = token.location;
        }

        if (token.type === Tokenizer.START_TAG_TOKEN) {
            this.emit('startTag', token.tagName, token.attrs, token.selfClosing, this.currentTokenLocation);
        } else if (token.type === Tokenizer.END_TAG_TOKEN) {
            this.emit('endTag', token.tagName, this.currentTokenLocation);
        } else if (token.type === Tokenizer.COMMENT_TOKEN) {
            this.emit('comment', token.data, this.currentTokenLocation);
        } else if (token.type === Tokenizer.DOCTYPE_TOKEN) {
            this.emit('doctype', token.name, token.publicId, token.systemId, this.currentTokenLocation);
        }
    }

    _emitPendingText() {
        if (this.pendingText !== null) {
            this.emit('text', this.pendingText, this.currentTokenLocation);
            this.pendingText = null;
        }
    }
}

module.exports = SAXParser;

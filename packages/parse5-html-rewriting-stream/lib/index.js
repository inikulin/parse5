'use strict';

const SAXParser = require('parse5-sax-parser');
const Tokenizer = require('parse5/lib/tokenizer');

class RewritingStream extends SAXParser {
    constructor() {
        super({ sourceCodeLocationInfo: true });

        this.posTracker = this.locInfoMixin.posTracker;

        this.tokenEmissionHelpers = {
            [Tokenizer.START_TAG_TOKEN]: {
                eventName: 'startTag',
                reshapeToken: token => this._reshapeStartTagToken(token)
            },
            [Tokenizer.END_TAG_TOKEN]: {
                eventName: 'endTag',
                reshapeToken: token => this._reshapeEndTagToken(token)
            },
            [Tokenizer.COMMENT_TOKEN]: {
                eventName: 'comment',
                reshapeToken: token => this._reshapeCommentToken(token)
            },
            [Tokenizer.DOCTYPE_TOKEN]: {
                eventName: 'doctype',
                reshapeToken: token => this._reshapeDoctypeToken(token)
            }
        };
    }

    _transform(chunk, encoding, callback) {
        this._parseChunk(chunk);

        callback();
    }

    _getCurrentTokenRawHtml() {
        const droppedBufferSize = this.posTracker.droppedBufferSize;
        const start = this.currentTokenLocation.startOffset - droppedBufferSize;
        const end = this.currentTokenLocation.endOffset - droppedBufferSize;

        return this.tokenizer.preprocessor.html.slice(start, end);
    }

    // Events
    _handleToken(token) {
        if (token.type === Tokenizer.EOF_TOKEN) {
            return;
        }

        const { eventName, reshapeToken } = this.tokenEmissionHelpers[token.type];

        this.currentTokenLocation = token.location;

        const raw = this._getCurrentTokenRawHtml();

        if (this.listenerCount(eventName) > 0) {
            this.emit(eventName, reshapeToken(token), raw);
        } else {
            this.emitRaw(raw);
        }

        // NOTE: don't skip new lines after <pre> and other tags,
        // otherwise we'll have incorrect raw data.
        this.parserFeedbackSimulator.skipNextNewLine = false;
    }

    _emitPendingText() {
        if (this.pendingText !== null) {
            const raw = this._getCurrentTokenRawHtml();

            if (this.listenerCount('text') > 0) {
                this.emit('text', this._createTextToken(), raw);
            } else {
                this.emitRaw(raw);
            }

            this.pendingText = null;
        }
    }

    // Emitter API
    emitDoctype(token) {
        let res = `<!DOCTYPE ${token.name}`;

        if (token.publicId !== null) {
            res += ` PUBLIC "${token.publicId}"`;
        } else if (token.systemId !== null) {
            res += ' SYSTEM';
        }

        if (token.systemId !== null) {
            res += ` "${token.systemId}"`;
        }

        res += '>';

        this.push(res);
    }

    emitStartTag(token) {
        let res = `<${token.tagName}`;

        const attrs = token.attrs;

        for (let i = 0; i < attrs.length; i++) {
            res += ` ${attrs[i].name}="${attrs[i].value}"`;
        }

        res += token.selfClosing ? '/>' : '>';

        this.push(res);
    }

    emitEndTag(token) {
        this.push(`</${token.tagName}>`);
    }

    emitText({ text }) {
        this.push(text);
    }

    emitComment(token) {
        this.push(`<!--${token.text}-->`);
    }

    emitRaw(html) {
        this.push(html);
    }
}

module.exports = RewritingStream;

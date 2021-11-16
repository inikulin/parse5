import { EndTag, StartTag, Doctype, Text, Comment } from './../../parse5-sax-parser/lib/index';
import type { Token, Location } from 'parse5/lib/common/token.js';
import { SAXParser } from 'parse5-sax-parser/lib/index.js';
import { escapeString } from 'parse5/lib/serializer/index.js';
import type { PositionTrackingPreprocessorMixin } from 'parse5/lib/extensions/position-tracking/preprocessor-mixin';

export class RewritingStream extends SAXParser {
    posTracker: PositionTrackingPreprocessorMixin;

    constructor() {
        super({ sourceCodeLocationInfo: true });

        this.posTracker = this.locInfoMixin!.posTracker;
    }

    override _transformChunk(chunk: string) {
        // NOTE: ignore upstream return value as we want to push to
        // the Writable part of Transform stream ourselves.
        super._transformChunk(chunk);
        return '';
    }

    _getRawHtml(location: Location) {
        const { droppedBufferSize } = this.posTracker;
        const start = location.startOffset - droppedBufferSize;
        const end = location.endOffset - droppedBufferSize;

        return this.tokenizer.preprocessor.html!.slice(start, end);
    }

    // Events
    override _handleToken(token: Token): boolean {
        if (!super._handleToken(token)) {
            this.emitRaw(this._getRawHtml(token.location!));
        }

        // NOTE: don't skip new lines after <pre> and other tags,
        // otherwise we'll have incorrect raw data.
        this.parserFeedbackSimulator.skipNextNewLine = false;
        return true;
    }

    // Emitter API
    override _emitToken(eventName: string, token: any) {
        this.emit(eventName, token, this._getRawHtml(token.sourceCodeLocation));
    }

    emitDoctype(token: Doctype) {
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

    emitStartTag(token: StartTag) {
        const res = token.attrs.reduce(
            (res, attr) => `${res} ${attr.name}="${escapeString(attr.value, true)}"`,
            `<${token.tagName}`
        );

        this.push(res + (token.selfClosing ? '/>' : '>'));
    }

    emitEndTag(token: EndTag) {
        this.push(`</${token.tagName}>`);
    }

    emitText({ text }: Text) {
        this.push(escapeString(text, false));
    }

    emitComment(token: Comment) {
        this.push(`<!--${token.text}-->`);
    }

    emitRaw(html: string) {
        this.push(html);
    }
}

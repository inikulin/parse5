import { EndTag, StartTag, Doctype, Text, Comment, SaxToken } from '../../sax-parser/lib/index';
import type { Token, Location } from '@parse5/parse5/lib/common/token.js';
import { SAXParser } from '@parse5/sax-parser/lib/index.js';
import { escapeString } from '@parse5/parse5/lib/serializer/index.js';
import type { Preprocessor } from '@parse5/parse5/lib/tokenizer/preprocessor.js';

/**
 * Streaming [SAX](https://en.wikipedia.org/wiki/Simple_API_for_XML)-style HTML rewriter.
 * A [transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform) (which means you can pipe _through_ it, see example).
 *
 * The rewriter uses the raw source representation of tokens if they are not modified by the user. Therefore, the resulting
 * HTML is not affected by parser error-recovery mechanisms as in a classical parsing-serialization roundtrip.
 *
 * @example
 *
 * ```js
 * const RewritingStream = require('@parse5/html-rewriting-stream');
 * const http = require('http');
 * const fs = require('fs');
 *
 * const file = fs.createWriteStream('/home/google.com.html');
 * const rewriter = new RewritingStream();
 *
 * // Replace divs with spans
 * rewriter.on('startTag', startTag => {
 *     if (startTag.tagName === 'span') {
 *         startTag.tagName = 'div';
 *     }
 *
 *     rewriter.emitStartTag(startTag);
 * });
 *
 * rewriter.on('endTag', endTag => {
 *     if (endTag.tagName === 'span') {
 *         endTag.tagName = 'div';
 *     }
 *
 *     rewriter.emitEndTag(endTag);
 * });
 *
 * // Wrap all text nodes with <i> tag
 * rewriter.on('text', (_, raw) => {
 *     // Use raw representation of text without HTML entities decoding
 *     rewriter.emitRaw(`<i>${raw}</i>`);
 * });
 *
 * http.get('http://google.com', res => {
 *    // Assumes response is UTF-8.
 *    res.setEncoding('utf8');
 *    // RewritingStream is the Transform stream, which means you can pipe
 *    // through it.
 *    res.pipe(rewriter).pipe(file);
 * });
 * ```
 */
export class RewritingStream extends SAXParser {
    posTracker: Preprocessor;

    /** Note: The `sourceCodeLocationInfo` is always enabled. */
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
    override _emitToken(eventName: string, token: SaxToken) {
        this.emit(eventName, token, this._getRawHtml(token.sourceCodeLocation!));
    }

    /** Emits serialized document type token into the output stream. */
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

    /** Emits serialized start tag token into the output stream. */
    emitStartTag(token: StartTag) {
        const res = token.attrs.reduce(
            (res, attr) => `${res} ${attr.name}="${escapeString(attr.value, true)}"`,
            `<${token.tagName}`
        );

        this.push(res + (token.selfClosing ? '/>' : '>'));
    }

    /** Emits serialized end tag token into the output stream. */
    emitEndTag(token: EndTag) {
        this.push(`</${token.tagName}>`);
    }

    /** Emits serialized text token into the output stream. */
    emitText({ text }: Text) {
        this.push(escapeString(text, false));
    }

    /** Emits serialized comment token into the output stream. */
    emitComment(token: Comment) {
        this.push(`<!--${token.text}-->`);
    }

    /** Emits raw HTML string into the output stream. */
    emitRaw(html: string) {
        this.push(html);
    }
}

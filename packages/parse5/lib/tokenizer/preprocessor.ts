import * as unicode from '../common/unicode.js';
import { ERR } from '../common/error-codes.js';

//Aliases
const $ = unicode.CODE_POINTS;

//Const
const DEFAULT_BUFFER_WATERLINE = 1 << 16;

//Preprocessor
//NOTE: HTML input preprocessing
//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#preprocessing-the-input-stream)
export class Preprocessor {
    html: string | null = null;
    private pos = -1;
    private lastGapPos = -1;
    private lastCharPos = -1;
    private gapStack: number[] = [];
    private skipNextNewLine = false;
    private lastChunkWritten = false;
    endOfChunkHit = false;
    bufferWaterline = DEFAULT_BUFFER_WATERLINE;

    private isEol = false;
    lineStartPos = 0;
    droppedBufferSize = 0;
    col = 0;
    line = 1;

    get offset(): number {
        return this.droppedBufferSize + this.pos;
    }

    _err(_err: string) {
        // NOTE: err reporting is noop by default. Enabled by mixin.
    }

    private _addGap() {
        this.gapStack.push(this.lastGapPos);
        this.lastGapPos = this.pos;
    }

    private _processSurrogate(cp: number) {
        //NOTE: try to peek a surrogate pair
        if (this.pos !== this.lastCharPos) {
            const nextCp = this.html!.charCodeAt(this.pos + 1);

            if (unicode.isSurrogatePair(nextCp)) {
                //NOTE: we have a surrogate pair. Peek pair character and recalculate code point.
                this.pos++;

                //NOTE: add gap that should be avoided during retreat
                this._addGap();

                return unicode.getSurrogatePairCodePoint(cp, nextCp);
            }
        }

        //NOTE: we are at the end of a chunk, therefore we can't infer surrogate pair yet.
        else if (!this.lastChunkWritten) {
            this.endOfChunkHit = true;
            return $.EOF;
        }

        //NOTE: isolated surrogate
        this._err(ERR.surrogateInInputStream);

        return cp;
    }

    dropParsedChunk() {
        const prevPos = this.pos;

        if (this.pos > this.bufferWaterline) {
            this.lastCharPos -= this.pos;
            this.html = this.html!.substring(this.pos);
            this.pos = 0;
            this.lastGapPos = -1;
            this.gapStack = [];
        }

        const reduction = prevPos - this.pos;

        this.lineStartPos -= reduction;
        this.droppedBufferSize += reduction;
    }

    write(chunk: string, isLastChunk: boolean) {
        if (this.html) {
            this.html += chunk;
        } else {
            this.html = chunk;
        }

        this.lastCharPos = this.html.length - 1;
        this.endOfChunkHit = false;
        this.lastChunkWritten = isLastChunk;
    }

    insertHtmlAtCurrentPos(chunk: string) {
        this.html =
            this.html!.substring(0, this.pos + 1) + chunk + this.html!.substring(this.pos + 1, this.html!.length);

        this.lastCharPos = this.html.length - 1;
        this.endOfChunkHit = false;
    }

    advance(): number {
        this.pos++;

        //NOTE: LF should be in the last column of the line
        if (this.isEol) {
            this.isEol = false;
            this.line++;
            this.lineStartPos = this.pos;
        }

        this.col = this.pos - this.lineStartPos + 1;

        if (this.pos > this.lastCharPos) {
            this.endOfChunkHit = !this.lastChunkWritten;
            return $.EOF;
        }

        let cp = this.html!.charCodeAt(this.pos);

        if (cp === $.LINE_FEED || (cp === $.CARRIAGE_RETURN && this.html!.charCodeAt(this.pos + 1) !== $.LINE_FEED)) {
            this.isEol = true;
        }

        //NOTE: any U+000A LINE FEED (LF) characters that immediately follow a U+000D CARRIAGE RETURN (CR) character
        //must be ignored.
        if (this.skipNextNewLine && cp === $.LINE_FEED) {
            this.skipNextNewLine = false;
            this._addGap();
            return this.advance();
        }

        //NOTE: all U+000D CARRIAGE RETURN (CR) characters must be converted to U+000A LINE FEED (LF) characters
        if (cp === $.CARRIAGE_RETURN) {
            this.skipNextNewLine = true;
            return $.LINE_FEED;
        }

        this.skipNextNewLine = false;

        if (unicode.isSurrogate(cp)) {
            cp = this._processSurrogate(cp);
        }

        //OPTIMIZATION: first check if code point is in the common allowed
        //range (ASCII alphanumeric, whitespaces, big chunk of BMP)
        //before going into detailed performance cost validation.
        const isCommonValidRange =
            (cp > 0x1f && cp < 0x7f) || cp === $.LINE_FEED || cp === $.CARRIAGE_RETURN || (cp > 0x9f && cp < 0xfd_d0);

        if (!isCommonValidRange) {
            this._checkForProblematicCharacters(cp);
        }

        return cp;
    }

    private _checkForProblematicCharacters(cp: number) {
        if (unicode.isControlCodePoint(cp)) {
            this._err(ERR.controlCharacterInInputStream);
        } else if (unicode.isUndefinedCodePoint(cp)) {
            this._err(ERR.noncharacterInInputStream);
        }
    }

    retreat() {
        if (this.pos === this.lastGapPos) {
            this.lastGapPos = this.gapStack.pop()!;
            this.pos--;
        }

        this.pos--;

        this.isEol = false;
        this.col = this.pos - this.lineStartPos + 1;
    }
}

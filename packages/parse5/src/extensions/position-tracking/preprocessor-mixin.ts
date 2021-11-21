import { Mixin } from '../../utils/Mixin.js';
import { Preprocessor } from '../../tokenizer/preprocessor.js';

export class PositionTrackingPreprocessorMixin extends Mixin<Preprocessor> {
    protected _preprocessor: Preprocessor;
    protected _isEol: boolean;
    protected _lineStartPos: number;
    protected _droppedBufferSize: number;
    public offset: number;
    public col: number;
    public line: number;

    public constructor(preprocessor: Preprocessor) {
        super(preprocessor);

        this._preprocessor = preprocessor;
        this._isEol = false;
        this._lineStartPos = 0;
        this._droppedBufferSize = 0;

        this.offset = 0;
        this.col = 0;
        this.line = 1;
    }

    protected _getOverriddenMethods(orig: Partial<Preprocessor>): Partial<Preprocessor> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const mxn = this;
        return {
            advance(this: Preprocessor): number {
                if (this.html === null) {
                    throw new Error('Tried to preprocess null HTML or position');
                }
                if (orig.advance === undefined) {
                    throw new Error('Advance method was missing');
                }
                const pos = this.pos + 1;
                const ch = this.html[pos];

                //NOTE: LF should be in the last column of the line
                if (mxn._isEol) {
                    mxn._isEol = false;
                    mxn.line++;
                    mxn._lineStartPos = pos;
                }

                if (ch === '\n' || (ch === '\r' && this.html[pos + 1] !== '\n')) {
                    mxn._isEol = true;
                }

                mxn.col = pos - mxn._lineStartPos + 1;
                mxn.offset = mxn._droppedBufferSize + pos;

                return orig.advance.call(this);
            },

            retreat(this: Preprocessor): void {
                orig.retreat?.call(this);

                mxn._isEol = false;
                mxn.col = this.pos - mxn._lineStartPos + 1;
            },

            dropParsedChunk(this: Preprocessor): void {
                const prevPos = this.pos;

                orig.dropParsedChunk?.call(this);

                const reduction = prevPos - this.pos;

                mxn._lineStartPos -= reduction;
                mxn._droppedBufferSize += reduction;
                mxn.offset = mxn._droppedBufferSize + this.pos;
            },
        };
    }
}

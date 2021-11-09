import type { Preprocessor } from './../../tokenizer/preprocessor.js';
import { Mixin, MappedMethods } from '../../utils/mixin.js';

export class PositionTrackingPreprocessorMixin extends Mixin<typeof Preprocessor> {
    isEol = false;
    lineStartPos = 0;
    droppedBufferSize = 0;
    offset = 0;
    col = 0;
    line = 1;

    override _getOverriddenMethods(
        mxn: PositionTrackingPreprocessorMixin,
        orig: MappedMethods<typeof Preprocessor>
    ): MappedMethods<typeof Preprocessor> {
        return {
            advance(this: Preprocessor) {
                const pos = this.pos + 1;
                const ch = this.html![pos];

                //NOTE: LF should be in the last column of the line
                if (mxn.isEol) {
                    mxn.isEol = false;
                    mxn.line++;
                    mxn.lineStartPos = pos;
                }

                if (ch === '\n' || (ch === '\r' && this.html![pos + 1] !== '\n')) {
                    mxn.isEol = true;
                }

                mxn.col = pos - mxn.lineStartPos + 1;
                mxn.offset = mxn.droppedBufferSize + pos;

                return orig.advance.call(this);
            },

            retreat(this: Preprocessor) {
                orig.retreat.call(this);

                mxn.isEol = false;
                mxn.col = this.pos - mxn.lineStartPos + 1;
            },

            dropParsedChunk(this: Preprocessor) {
                const prevPos = this.pos;

                orig.dropParsedChunk.call(this);

                const reduction = prevPos - this.pos;

                mxn.lineStartPos -= reduction;
                mxn.droppedBufferSize += reduction;
                mxn.offset = mxn.droppedBufferSize + this.pos;
            },
        };
    }
}

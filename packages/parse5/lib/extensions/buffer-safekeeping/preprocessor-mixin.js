'use strict';

const Mixin = require('../../utils/mixin');

class BufferSafekeepingPreprocessorMixin extends Mixin {
    constructor(preprocessor) {
        super(preprocessor);

        this.safekeepingOffset = 0;
    }

    _getOverriddenMethods(mxn, orig) {
        return {
            getDropPosition() {
                return Math.min(orig.getDropPosition(), mxn.safekeepingOffset - mxn.droppedBufferSize);
            }
        };
    }
}

module.exports = BufferSafekeepingPreprocessorMixin;

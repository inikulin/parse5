'use strict';

var ErrorReportingMixinBase = require('./mixin_base'),
    ErrorReportingTokenizerMixin = require('./tokenizer_mixin'),
    LocationInfoTokenizerMixin = require('../location_info/tokenizer_mixin'),
    Mixin = require('../../utils/mixin'),
    inherits = require('util').inherits;

var ErrorReportingParserMixin = (module.exports = function(parser, opts) {
    ErrorReportingMixinBase.call(this, parser, opts);

    this.opts = opts;
    this.ctLoc = null;
    this.locBeforeToken = false;
});

inherits(ErrorReportingParserMixin, ErrorReportingMixinBase);

ErrorReportingParserMixin.prototype._setErrorLocation = function(err) {
    if (this.ctLoc) {
        err.startLine = this.ctLoc.startLine;
        err.startCol = this.ctLoc.startCol;
        err.startOffset = this.ctLoc.startOffset;

        err.endLine = this.locBeforeToken ? this.ctLoc.startLine : this.ctLoc.endLine;
        err.endCol = this.locBeforeToken ? this.ctLoc.startCol : this.ctLoc.endCol;
        err.endOffset = this.locBeforeToken ? this.ctLoc.startOffset : this.ctLoc.endOffset;
    }
};

ErrorReportingParserMixin.prototype._getOverriddenMethods = function(mxn, orig) {
    return {
        _bootstrap: function(document, fragmentContext) {
            orig._bootstrap.call(this, document, fragmentContext);

            Mixin.install(this.tokenizer, ErrorReportingTokenizerMixin, mxn.opts);
            Mixin.install(this.tokenizer, LocationInfoTokenizerMixin);
        },

        _processInputToken: function(token) {
            mxn.ctLoc = token.location;

            orig._processInputToken.call(this, token);
        },

        _err: function(code, options) {
            mxn.locBeforeToken = options && options.beforeToken;
            mxn._reportError(code);
        }
    };
};

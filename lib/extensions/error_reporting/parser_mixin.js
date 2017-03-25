'use strict';

var ErrorReportingMixinBase = require('./mixin_base'),
    ErrorReportingTokenizerMixin = require('./tokenizer_mixin'),
    LocationInfoTokenizerMixin = require('../location_info/tokenizer_mixin'),
    inherits = require('util').inherits;


var ErrorReportingParserMixin = module.exports = function (parser, onParseError) {
    ErrorReportingMixinBase.call(this, parser, onParseError);

    this.currentTokenLocation = null;
};

inherits(ErrorReportingParserMixin, ErrorReportingMixinBase);

ErrorReportingParserMixin.prototype._setErrorLocation = function (err) {
    if (this.currentTokenLocation) {
        err.line = this.currentTokenLocation.endLine;
        err.col = this.currentTokenLocation.endCol;
        err.offset = this.currentTokenLocation.endOffset;
    }
};

ErrorReportingParserMixin.prototype._getOverriddenMethods = function (mxn, orig) {
    var methods = ErrorReportingMixinBase.prototype._getOverriddenMethods.call(this, mxn, orig);

    return Object.assign({
        _boostrap: function (document, fragmentContext) {
            orig._bootstrap.call(this, document, fragmentContext);

            new ErrorReportingTokenizerMixin(this.tokenizer);
            new LocationInfoTokenizerMixin(this.tokenizer);
        },

        _processInputToken: function (token) {
            mxn.currentTokenLocation = token.location;

            orig._processInputToken.call(this, token);
        }
    }, methods);
};

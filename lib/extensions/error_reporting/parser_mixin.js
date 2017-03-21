'use strict';

var ErrorReportingMixinBase = require('./mixin_base'),
    ErrorReportingTokenizerMixin = require('./tokenizer_mixin'),
    inherits = require('util').inherits;


var ErrorReportingParserMixin = module.exports = function (parser, onParseError) {
    ErrorReportingMixinBase.call(this, parser, onParseError);
};

inherits(ErrorReportingParserMixin, ErrorReportingMixinBase);

ErrorReportingParserMixin.prototype._getOverriddenMethods = function (mxn, orig) {
    var methods = ErrorReportingMixinBase.prototype._getOverriddenMethods.call(this, mxn, orig);

    return Object.assign({
        _boostrap: function (document, fragmentContext) {
            orig._bootstrap.call(this, document, fragmentContext);

            var tokenizerMixin = new ErrorReportingTokenizerMixin(this.tokenizer);

            mxn.posTracker = tokenizerMixin.posTracker;
        }
    }, methods);
};

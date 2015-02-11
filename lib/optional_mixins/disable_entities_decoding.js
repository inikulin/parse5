//Patches
function patchTokenizer(tokenizer) {
    tokenizer._consumeCharacterReference = function () {
        this._unconsume();
        return null;
    };
}

function patchParser(parser, isSimpleApi) {
    parser._reset$ = parser._reset;

    parser._reset = function () {
        this._reset$.apply(this, arguments);
        patchTokenizer(isSimpleApi ? this.tokenizerProxy.tokenizer : this.tokenizer);
    };
}


//Install mixin
exports.installIntoParser = function (parser) {
    patchParser(parser, false);
};

exports.installIntoSimpleApiParser = function (parser) {
    patchParser(parser, true);
};

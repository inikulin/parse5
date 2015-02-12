//Assign mixin
exports.assign = function (tokenizer) {
    var tokenizerProto = Object.getPrototypeOf(tokenizer);

    //NOTE: Patch reset method
    tokenizer._reset = function () {
        tokenizerProto._reset.call(this);
        this.tokenStartLoc = -1;
    };

    //NOTE: add location info builder method
    tokenizer._attachLocationInfo = function (token) {
        token.location = {
            start: this.tokenStartLoc,
            end: -1
        };
    };

    //NOTE: patch token creation methods and attach location objects
    tokenizer._createStartTagToken = function (tagNameFirstCh) {
        tokenizerProto._createStartTagToken.call(this, tagNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createEndTagToken = function (tagNameFirstCh) {
        tokenizerProto._createEndTagToken.call(this, tagNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createCommentToken = function () {
        tokenizerProto._createCommentToken.call(this);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createDoctypeToken = function (doctypeNameFirstCh) {
        tokenizerProto._createDoctypeToken.call(this, doctypeNameFirstCh);
        this._attachLocationInfo(this.currentToken);
    };

    tokenizer._createCharacterToken = function (type, ch) {
        tokenizerProto._createCharacterToken.call(this, type, ch);
        this._attachLocationInfo(this.currentCharacterToken);
    };

    //NOTE: patch initial states for each mode to obtain token start position
    Object.keys(tokenizerProto.MODE)

        .map(function (modeName) {
            return tokenizerProto.MODE[modeName];
        })

        .forEach(function (state) {
            tokenizer[state] = function (cp) {
                this.tokenStartLoc = this.preprocessor.pos;
                tokenizerProto[state].call(this, cp);
            };
        });
};

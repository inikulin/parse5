//Create mixin
function createMixin(tokenizerProto) {
    var mixin = {
        _reset: function () {
            tokenizerProto._reset.call(this);

            this.tokenStartLoc = -1;
        },

        _attachLocationInfo: function (token) {
            token.location = {
                start: this.tokenStartLoc,
                end: -1
            };
        },

        //NOTE: patch token creation methods and attach location objects
        _createStartTagToken: function (tagNameFirstCh) {
            tokenizerProto._createStartTagToken.call(this, tagNameFirstCh);
            this._attachLocationInfo(this.currentToken);
        },

        _createEndTagToken: function (tagNameFirstCh) {
            tokenizerProto._createEndTagToken.call(this, tagNameFirstCh);
            this._attachLocationInfo(this.currentToken);
        },

        _createCommentToken: function () {
            tokenizerProto._createCommentToken.call(this);
            this._attachLocationInfo(this.currentToken);
        },

        _createDoctypeToken: function (doctypeNameFirstCh) {
            tokenizerProto._createDoctypeToken.call(this, doctypeNameFirstCh);
            this._attachLocationInfo(this.currentToken);
        },

        _createCharacterToken: function (type, ch) {
            tokenizerProto._createCharacterToken.call(this, type, ch);
            this._attachLocationInfo(this.currentCharacterToken);
        }
    };

    //NOTE: patch initial states for each mode to obtain token start position
    Object.keys(tokenizerProto.MODE)

        .map(function (modeName) {
            return tokenizerProto.MODE[modeName];
        })

        .forEach(function (state) {
            mixin[state] = function (cp) {
                this.tokenStartLoc = this.preprocessor.pos;
                tokenizerProto[state].call(this, cp);
            };
        });

    return mixin;
}


//Assign mixin
exports.assign = function (tokenizer) {
    var tokenizerProto = Object.getPrototypeOf(tokenizer),
        mixin = createMixin(tokenizerProto);

    Object.keys(mixin).forEach(function (methodName) {
        tokenizer[methodName] = mixin[methodName];
    });
};

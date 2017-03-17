'use strict';

var Mixin = require('../../utils/mixin'),
    Tokenizer = require('../../tokenizer'),
    $ = require('../../common/unicode').CODE_POINTS,
    inherits = require('util').inherits;

var LocationInfoTokenizerMixin = module.exports = function (tokenizer) {
    Mixin.call(this, tokenizer);

    this.tokenizer = tokenizer;
    this.isEol = false;
    this.lineStartPos = 0;
    this.col = -1;
    this.line = 1;
    this.currentAttrLocation = null;
    this.currentTokenLocation = null;
};

inherits(LocationInfoTokenizerMixin, Mixin);

LocationInfoTokenizerMixin.prototype._recordCurrentTokenLocation = function () {
    this.currentTokenLocation = {
        line: this.line,
        col: this.col,
        startOffset: this.tokenizer.preprocessor.sourcePos,
        endOffset: -1
    };
};

LocationInfoTokenizerMixin.prototype._recordCurrentAttrLocation = function () {
    this.currentAttrLocation = {
        line: this.line,
        col: this.col,
        startOffset: this.tokenizer.preprocessor.sourcePos,
        endOffset: -1
    };
};

LocationInfoTokenizerMixin.prototype._recordCurrentAttrLocation = function () {
    this.currentAttrLocation = {
        line: this.line,
        col: this.col,
        startOffset: this.tokenizer.preprocessor.sourcePos,
        endOffset: -1
    };
};

LocationInfoTokenizerMixin.prototype._attachCurrentAttrLocationInfo = function () {
    this.currentAttrLocation.endOffset = this.tokenizer.preprocessor.sourcePos;

    var currentToken = this.tokenizer.currentToken,
        currentAttr = this.tokenizer.currentAttr;

    if (!currentToken.location.attrs)
        currentToken.location.attrs = Object.create(null);

    currentToken.location.attrs[currentAttr.name] = this.currentAttrLocation;
};

LocationInfoTokenizerMixin.prototype._getOverriddenMethods = function () {
    var m = this,
        orig = m.originalMethods;

    var methods = {
        //NOTE: patch consumption method to track line/col information
        _consume: function () {
            var cp = orig._consume.call(this);

            //NOTE: LF should be in the last column of the line
            if (m.isEol) {
                m.isEol = false;
                m.line++;
                m.lineStartPos = this.preprocessor.sourcePos;
            }

            if (cp === $.LINE_FEED)
                m.isEol = true;

            m.col = this.preprocessor.sourcePos - m.lineStartPos + 1;

            return cp;
        },

        _unconsume: function () {
            orig._unconsume.call(this);
            m.isEol = false;

            m.col = this.preprocessor.sourcePos - m.lineStartPos + 1;
        },

        _createStartTagToken: function () {
            orig._createStartTagToken.call(this);
            this.currentToken.location = m.currentTokenLocation;
        },

        _createEndTagToken: function () {
            orig._createEndTagToken.call(this);
            this.currentToken.location = m.currentTokenLocation;
        },

        _createCommentToken: function () {
            orig._createCommentToken.call(this);
            this.currentToken.location = m.currentTokenLocation;
        },

        _createDoctypeToken: function (initialName) {
            orig._createDoctypeToken.call(this, initialName);
            this.currentToken.location = m.currentTokenLocation;
        },

        _createCharacterToken: function (type, ch) {
            orig._createCharacterToken.call(this, type, ch);
            this.currentCharacterToken.location = m.currentTokenLocation;
        },

        _createAttr: function (attrNameFirstCh) {
            orig._createAttr.call(this, attrNameFirstCh);
            m._recordCurrentAttrLocation();
        },

        _leaveAttrName: function (toState) {
            orig._leaveAttrName.call(this, toState);
            m._attachCurrentAttrLocationInfo();
        },

        _leaveAttrValue: function (toState) {
            orig._leaveAttrValue.call(this, toState);
            m._attachCurrentAttrLocationInfo();
        },

        _emitCurrentToken: function () {
            //NOTE: if we have pending character token make it's end location equal to the
            //current token's start location.
            if (this.currentCharacterToken)
                this.currentCharacterToken.location.endOffset = this.currentToken.location.startOffset;

            this.currentToken.location.endOffset = this.preprocessor.sourcePos + 1;
            orig._emitCurrentToken.call(this);
        },

        _emitCurrentCharacterToken: function () {
            //NOTE: if we have character token and it's location wasn't set in the _emitCurrentToken(),
            //then set it's location at the current preprocessor position.
            //We don't need to increment preprocessor position, since character token
            //emission is always forced by the start of the next character token here.
            //So, we already have advanced position.
            if (this.currentCharacterToken && this.currentCharacterToken.location.endOffset === -1)
                this.currentCharacterToken.location.endOffset = this.preprocessor.sourcePos;

            orig._emitCurrentCharacterToken.call(this);
        }
    };

    //NOTE: patch initial states for each mode to obtain token start position
    Object.keys(Tokenizer.MODE).forEach(function (modeName) {
        var state = Tokenizer.MODE[modeName];

        methods[state] = function (cp) {
            m._recordCurrentTokenLocation();
            orig[state].call(this, cp);
        };
    });

    return methods;
};


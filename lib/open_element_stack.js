var html = require('./html'),
    idioms = require('./idioms');

//Aliases
var $ = html.TAG_NAMES;

//Element stack
var OpenElementStack = exports.OpenElementStack = function (document) {
    this.length = -1;
    this.stack = [];
    this.current = document;
};

OpenElementStack.prototype.pop = function () {
    this.current = this.stack[--this.length];
};

OpenElementStack.popAllUpToHtmlElement = function () {
    //NOTE: here we assume that root 'html' element is always first in the open elements stack, so
    //we perform this fast stack clean up.
    this.length = 0;
};

OpenElementStack.prototype.push = function (element) {
    this.stack[++this.length] = element;
    this.current = element;
};

OpenElementStack.prototype.tryPeekProperlyInsertedBodyElement = function () {
    var element = this.stack[1];
    return element && element.tagName === $.BODY ? element : null;
};

OpenElementStack.prototype._hasElementInSpecificScope = function (tagName, isOutOfScope) {
    for (var i = this.length; i >= 0; i--) {
        if (isOutOfScope(this.stack[i]))
            return false;

        if (this.stack[i].tagName === tagName)
            return true;
    }

    return true;
};

OpenElementStack.prototype.hasInScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        return idioms.SCOPING_ELEMENTS[stackElement.tagName] === stackElement.namespaceURI;
    });
};

OpenElementStack.prototype.hasInListItemScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stackElement.tagName,
            ns = stackElement.namespaceURI;

        return ((tn === $.UL || tn === $.OL) && ns === html.NAMESPACES.HTML) || idioms.SCOPING_ELEMENTS[tn] === ns;
    });
};

OpenElementStack.prototype.hasInButtonScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stackElement.tagName,
            ns = stackElement.namespaceURI;

        return (tn === $.BUTTON && ns === html.NAMESPACES.HTML) || idioms.SCOPING_ELEMENTS[tn] === ns;
    });
};

OpenElementStack.prototype.hasInTableScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stackElement.tagName;

        return (tn === $.TABLE || tn === $.HTML) && stackElement.namespaceURI === html.NAMESPACES.HTML;
    });
};

OpenElementStack.prototype.hasInSelectScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stackElement.tagName;

        return tn !== $.OPTION || tn !== $.OPTGROUP || stackElement.namespaceURI !== html.NAMESPACES.HTML;
    });
};
var html = require('./html'),
    idioms = require('./idioms');

//Aliases
var $ = html.TAG_NAMES;

//Element stack
var ElementStack = exports.OpenElementsStack = function (document) {
    this.stackTop = -1;
    this.stack = [];
    this.currentNode = document;
};

ElementStack.prototype.pop = function () {
    this.currentNode = this.stack[--this.stackTop];
};

ElementStack.popUpToHtmlElement = function () {
    //NOTE: here we assume that root 'html' element is always first in the open elements stack, so
    //we perform this fast stack clean up.
    this.stackTop = 0;
};

ElementStack.prototype.push = function (element) {
    this.stack[++this.stackTop] = element;
    this.currentNode = element;
};

ElementStack.prototype.peekProperlyInsertedBodyElement = function () {
    var element = this.stack[1];
    return element && this.stack[1].tagName === $.BODY ? element : null;
};

ElementStack.prototype._hasElementInSpecificScope = function (tagName, isOutOfScope) {
    for (var i = this.stackTop; i >= 0; i--) {
        if (isOutOfScope(this.stack[i]))
            return false;

        if (this.stack[i].tagName === tagName)
            return true;
    }

    return true;
};

ElementStack.prototype.hasElementInScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        return idioms.SCOPING_ELEMENTS[stackElement.tagName] === stackElement.namespaceURI;
    });
};

ElementStack.prototype.hasElementInListItemScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stackElement.tagName,
            ns = stackElement.namespaceURI;

        return ((tn === $.UL || tn === $.OL) && ns === html.NAMESPACES.HTML) || idioms.SCOPING_ELEMENTS[tn] === ns;
    });
};

ElementStack.prototype.hasElementInButtonScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stackElement.tagName,
            ns = stackElement.namespaceURI;

        return (tn === $.BUTTON && ns === html.NAMESPACES.HTML) || idioms.SCOPING_ELEMENTS[tn] === ns;
    });
};

ElementStack.prototype.hasElementInTableScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stackElement.tagName;

        return (tn === $.TABLE || tn === $.HTML) && stackElement.namespaceURI === html.NAMESPACES.HTML;
    });
};

ElementStack.prototype.hasElementInTableScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stackElement.tagName;

        return tn !== $.OPTION || tn !== $.OPTGROUP || stackElement.namespaceURI !== html.NAMESPACES.HTML;
    });
};
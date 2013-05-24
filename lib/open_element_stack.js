var html = require('./html'),
    idioms = require('./idioms');

//Aliases
var $ = html.TAG_NAMES;

//Stack of open elements
var OpenElementStack = exports.OpenElementStack = function (document) {
    this.stackTop = -1;
    this.stack = [];
    this.current = document;
};

//Element in scope
OpenElementStack.prototype._hasElementInSpecificScope = function (tagName, isOutOfScope) {
    for (var i = this.stackTop; i >= 0; i--) {
        if (this.stack[i].tagName === tagName)
            return true;

        if (isOutOfScope(this.stack[i]))
            return false;
    }

    return true;
};

//Mutations
OpenElementStack.prototype.push = function (element) {
    this.stack[++this.stackTop] = element;
    this.current = element;
};

OpenElementStack.prototype.pop = function () {
    this.current = this.stack[--this.stackTop];
};

OpenElementStack.prototype.popUntilTagNamePopped = function (tagName) {
    while (this.stackTop > -1) {
        var tn = this.current.tagName;

        this.pop();

        if (tn === tagName)
            break;
    }
};

OpenElementStack.prototype.popUntilElementPopped = function (element) {
    while (this.stackTop > -1) {
        var poppedElement = this.current;

        this.pop();

        if (poppedElement === element)
            break;
    }
};

OpenElementStack.prototype.popUntilNumberedHeaderPopped = function () {
    while (this.stackTop > -1) {
        var tn = this.current.tagName;

        this.pop();

        if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
            break;
    }
};

OpenElementStack.prototype.popAllUpToHtmlElement = function () {
    //NOTE: here we assume that root <html> element is always first in the open element stack, so
    //we perform this fast stack clean up.
    this.stackTop = 0;
    this.current = this.stack[0];
};

OpenElementStack.prototype.clearBackToTableContext = function () {
    while (this.current.tagName !== $.TABLE && this.current.tagName !== $.HTML)
        this.pop();
};

OpenElementStack.prototype.remove = function (element) {
    for (var i = this.stackTop; i >= 0; i--) {
        if (this.stack[i] === element) {
            this.stack.splice(i, 1);
            this.stackTop--;
            break;
        }
    }
};

//Search
OpenElementStack.prototype.tryPeekProperlyNestedBodyElement = function () {
    //Properly nested <body> element (should be second element in stack).
    var element = this.stack[1];
    return element && element.tagName === $.BODY ? element : null;
};

OpenElementStack.prototype.contains = function (element) {
    return this.stack.indexOf(element) > -1;
};

//Element in scope
OpenElementStack.prototype.hasInScope = function (tagName) {
    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        return idioms.SCOPING_ELEMENTS[stackElement.tagName] === stackElement.namespaceURI;
    });
};

OpenElementStack.prototype.hasNumberedHeaderInScope = function () {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.stack[i].tagName;

        if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
            return true;

        if (idioms.SCOPING_ELEMENTS[tn] === this.stack[i].namespaceURI)
            return false;
    }

    return true;
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

        return (tn !== $.OPTION && tn !== $.OPTGROUP) || stackElement.namespaceURI !== html.NAMESPACES.HTML;
    });
};
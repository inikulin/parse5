var html = require('./html'),
    idioms = require('./idioms');

//Aliases
var $ = html.TAG_NAMES;

//Stack of open elements
var OpenElementStack = exports.OpenElementStack = function (document, treeAdapter) {
    this.stackTop = -1;
    this.stack = [];
    this.current = document;
    this.currentTagName = null;
    this.currentNamespaceURI = null;
    this.treeAdapter = treeAdapter;
};

//Element in scope
OpenElementStack.prototype._hasElementInSpecificScope = function (tagName, isOutOfScope) {
    for (var i = this.stackTop; i >= 0; i--) {
        if (this.treeAdapter.getElementTagName(this.stack[i]) === tagName)
            return true;

        if (isOutOfScope(this.stack[i]))
            return false;
    }

    return true;
};

//Index of element
OpenElementStack.prototype._indexOf = function (element) {
    var idx = -1;

    for (var i = this.stackTop; i >= 0; i--) {
        if (this.stack[i] === element) {
            idx = i;
            break;
        }
    }
    return idx;
};

//Mutations
OpenElementStack.prototype.push = function (element) {
    this.stack[++this.stackTop] = element;
    this.current = element;
    this.currentTagName = this.treeAdapter.getElementTagName(this.current);
    this.currentNamespaceURI = this.treeAdapter.getElementNamespaceURI(this.current);
};

OpenElementStack.prototype.pop = function () {
    this.current = this.stack[--this.stackTop];
    this.currentTagName = this.current && this.treeAdapter.getElementTagName(this.current);
    this.currentNamespaceURI = this.current && this.treeAdapter.getElementNamespaceURI(this.current);
};

OpenElementStack.prototype.popUntilTagNamePopped = function (tagName) {
    while (this.stackTop > -1) {
        var tn = this.currentTagName;

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
        var tn = this.currentTagName;

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
    while (this.currentTagName !== $.TABLE && this.currentTagName !== $.HTML)
        this.pop();
};

OpenElementStack.prototype.clearBackToTableRowContext = function () {
    while (this.currentTagName !== $.TR && this.currentTagName !== $.HTML)
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
    return element && this.treeAdapter.getElementTagName(element) === $.BODY ? element : null;
};

OpenElementStack.prototype.contains = function (element) {
    return this._indexOf(element) > -1;
};

OpenElementStack.prototype.getCommonAncestor = function (element) {
    var elementIdx = this._indexOf(element);

    return --elementIdx >= 0 ? this.stack[elementIdx] : null;
};

OpenElementStack.prototype.isRootHtmlElementCurrent = function () {
    return this.stackTop === 0 && this.currentTagName === $.HTML;
};

//Element in scope
//TODO avoid usage of closures
OpenElementStack.prototype.hasInScope = function (tagName) {
    var treeAdapter = this.treeAdapter;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = treeAdapter.getElementTagName(stackElement),
            ns = treeAdapter.getElementNamespaceURI(stackElement);

        return idioms.SCOPING_ELEMENTS[tn] === ns;
    });
};

OpenElementStack.prototype.hasNumberedHeaderInScope = function () {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getElementTagName(this.stack[i]);

        if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
            return true;

        if (idioms.SCOPING_ELEMENTS[tn] === this.treeAdapter.getElementNamespaceURI(this.stack[i]))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInListItemScope = function (tagName) {
    var treeAdapter = this.treeAdapter;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = treeAdapter.getElementTagName(stackElement),
            ns = treeAdapter.getElementNamespaceURI(stackElement);

        return ((tn === $.UL || tn === $.OL) && ns === html.NAMESPACES.HTML) || idioms.SCOPING_ELEMENTS[tn] === ns;
    });
};

OpenElementStack.prototype.hasInButtonScope = function (tagName) {
    var treeAdapter = this.treeAdapter;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = treeAdapter.getElementTagName(stackElement),
            ns = treeAdapter.getElementNamespaceURI(stackElement);

        return (tn === $.BUTTON && ns === html.NAMESPACES.HTML) || idioms.SCOPING_ELEMENTS[tn] === ns;
    });
};

OpenElementStack.prototype.hasInTableScope = function (tagName) {
    var treeAdapter = this.treeAdapter;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = treeAdapter.getElementTagName(stackElement);

        return (tn === $.TABLE || tn === $.HTML) &&
               treeAdapter.getElementNamespaceURI(stackElement) === html.NAMESPACES.HTML;
    });
};

OpenElementStack.prototype.hasInSelectScope = function (tagName) {
    var treeAdapter = this.treeAdapter;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = treeAdapter.getElementTagName(stackElement);

        return tn !== $.OPTION && tn !== $.OPTGROUP &&
               treeAdapter.getElementNamespaceURI(stackElement) === html.NAMESPACES.HTML;
    });
};

//Integration points
OpenElementStack.prototype.isInMathMLTextIntegrationPoint = function () {
    return this.currentNamespaceURI === html.NAMESPACES.MATHML &&
           (this.currentTagName === $.MI || this.currentTagName === $.MO || this.currentTagName === $.MN ||
            this.currentTagName === $.MS || this.currentTagName === $.MTEXT);
};

OpenElementStack.prototype.isInHtmlIntegrationPoint = function () {
    //TODO
};
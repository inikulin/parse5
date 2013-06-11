var HTML = require('./html');

//Aliases
var $ = HTML.TAG_NAMES,
    NAMESPACES = HTML.NAMESPACES;

//Attributes
var ENCODING_ATTR = 'encoding',
    TEXT_HTML_MIME_TYPE = 'text/html',
    APPLICATION_XML_MIME_TYPE = 'application/xhtml+xml';

//Scoping elements
var SCOPING_ELEMENTS = {};

SCOPING_ELEMENTS[$.APPLET] = NAMESPACES.HTML;
SCOPING_ELEMENTS[$.CAPTION] = NAMESPACES.HTML;
SCOPING_ELEMENTS[$.HTML] = NAMESPACES.HTML;
SCOPING_ELEMENTS[$.TABLE] = NAMESPACES.HTML;
SCOPING_ELEMENTS[$.TD] = NAMESPACES.HTML;
SCOPING_ELEMENTS[$.TH] = NAMESPACES.HTML;
SCOPING_ELEMENTS[$.MARQUEE] = NAMESPACES.HTML;
SCOPING_ELEMENTS[$.OBJECT] = NAMESPACES.HTML;
SCOPING_ELEMENTS[$.MI] = NAMESPACES.MATHML;
SCOPING_ELEMENTS[$.MO] = NAMESPACES.MATHML;
SCOPING_ELEMENTS[$.MN] = NAMESPACES.MATHML;
SCOPING_ELEMENTS[$.MS] = NAMESPACES.MATHML;
SCOPING_ELEMENTS[$.MTEXT] = NAMESPACES.MATHML;
SCOPING_ELEMENTS[$.ANNOTATION_XML] = NAMESPACES.MATHML;
SCOPING_ELEMENTS[$.FOREIGN_OBJECT] = NAMESPACES.SVG;
SCOPING_ELEMENTS[$.DESC] = NAMESPACES.SVG;
SCOPING_ELEMENTS[$.TITLE] = NAMESPACES.SVG;

//Tag names that require implied end tag
var REQUIRES_IMPLIED_END_TAG = {};

REQUIRES_IMPLIED_END_TAG[$.DD] = true;
REQUIRES_IMPLIED_END_TAG[$.DT] = true;
REQUIRES_IMPLIED_END_TAG[$.LI] = true;
REQUIRES_IMPLIED_END_TAG[$.OPTION] = true;
REQUIRES_IMPLIED_END_TAG[$.OPTGROUP] = true;
REQUIRES_IMPLIED_END_TAG[$.P] = true;
REQUIRES_IMPLIED_END_TAG[$.RP] = true;
REQUIRES_IMPLIED_END_TAG[$.RT] = true;


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
OpenElementStack.prototype._isScopingElement = function (tagName, namespaceURI) {
    return SCOPING_ELEMENTS[tagName] === namespaceURI;
};

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
OpenElementStack.prototype.hasInScope = function (tagName) {
    var stack = this;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stack.treeAdapter.getElementTagName(stackElement),
            ns = stack.treeAdapter.getElementNamespaceURI(stackElement);

        return stack._isScopingElement(tn, ns);
    });
};

OpenElementStack.prototype.hasNumberedHeaderInScope = function () {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getElementTagName(this.stack[i]);

        if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
            return true;

        if (this._isScopingElement(tn, this.treeAdapter.getElementNamespaceURI(this.stack[i])))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInListItemScope = function (tagName) {
    var stack = this;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stack.treeAdapter.getElementTagName(stackElement),
            ns = stack.treeAdapter.getElementNamespaceURI(stackElement);

        return ((tn === $.UL || tn === $.OL) && ns === NAMESPACES.HTML) || stack._isScopingElement(tn, ns);
    });
};

OpenElementStack.prototype.hasInButtonScope = function (tagName) {
    var stack = this;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = stack.treeAdapter.getElementTagName(stackElement),
            ns = stack.treeAdapter.getElementNamespaceURI(stackElement);

        return (tn === $.BUTTON && ns === NAMESPACES.HTML) || stack._isScopingElement(tn, ns);
    });
};

OpenElementStack.prototype.hasInTableScope = function (tagName) {
    var treeAdapter = this.treeAdapter;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = treeAdapter.getElementTagName(stackElement);

        return (tn === $.TABLE || tn === $.HTML) &&
               treeAdapter.getElementNamespaceURI(stackElement) === NAMESPACES.HTML;
    });
};

OpenElementStack.prototype.hasInSelectScope = function (tagName) {
    var treeAdapter = this.treeAdapter;

    return this._hasElementInSpecificScope(tagName, function (stackElement) {
        var tn = treeAdapter.getElementTagName(stackElement);

        return tn !== $.OPTION && tn !== $.OPTGROUP &&
               treeAdapter.getElementNamespaceURI(stackElement) === NAMESPACES.HTML;
    });
};

//Integration points
OpenElementStack.prototype.isMathMLTextIntegrationPoint = function () {
    return this.currentNamespaceURI === NAMESPACES.MATHML &&
           (this.currentTagName === $.MI || this.currentTagName === $.MO || this.currentTagName === $.MN ||
            this.currentTagName === $.MS || this.currentTagName === $.MTEXT);
};

OpenElementStack.prototype.isHtmlIntegrationPoint = function () {
    if (this.currentNamespaceURI === NAMESPACES.MATHML && this.currentTagName === $.ANNOTATION_XML) {
        var attrs = this.treeAdapter.getElementAttrs(this.current);

        for (var i = 0; i < attrs.length; i++) {
            if (attrs[i].name === ENCODING_ATTR) {
                var value = attrs[i].value.toLowerCase();

                if (value === APPLICATION_XML_MIME_TYPE || value === TEXT_HTML_MIME_TYPE)
                    return true;
            }
        }
    }

    return this.currentNamespaceURI === NAMESPACES.SVG && (this.currentTagName === $.FOREIGN_OBJECT ||
                                                           this.currentTagName === $.DESC ||
                                                           this.currentTagName === $.TITLE);
};


//Implied end tags
OpenElementStack.prototype.generateImpliedEndTags = function () {
    while (REQUIRES_IMPLIED_END_TAG[this.currentTagName])
        this.pop();
};

OpenElementStack.prototype.generateImpliedEndTagsWithExclusion = function (exclusionTagName) {
    while (REQUIRES_IMPLIED_END_TAG[this.currentTagName] &&
           this.currentTagName !== exclusionTagName) {
        this.pop();
    }
};

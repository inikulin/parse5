var HTML = require('./html');

//Aliases
var $ = HTML.TAG_NAMES,
    NS = HTML.NAMESPACES;

//Attributes
var ENCODING_ATTR = 'encoding',
    TEXT_HTML_MIME_TYPE = 'text/html',
    APPLICATION_XML_MIME_TYPE = 'application/xhtml+xml';

//Scoping elements
var SCOPING_ELEMENTS = {};

SCOPING_ELEMENTS[$.APPLET] = NS.HTML;
SCOPING_ELEMENTS[$.CAPTION] = NS.HTML;
SCOPING_ELEMENTS[$.HTML] = NS.HTML;
SCOPING_ELEMENTS[$.TABLE] = NS.HTML;
SCOPING_ELEMENTS[$.TD] = NS.HTML;
SCOPING_ELEMENTS[$.TH] = NS.HTML;
SCOPING_ELEMENTS[$.MARQUEE] = NS.HTML;
SCOPING_ELEMENTS[$.OBJECT] = NS.HTML;
SCOPING_ELEMENTS[$.MI] = NS.MATHML;
SCOPING_ELEMENTS[$.MO] = NS.MATHML;
SCOPING_ELEMENTS[$.MN] = NS.MATHML;
SCOPING_ELEMENTS[$.MS] = NS.MATHML;
SCOPING_ELEMENTS[$.MTEXT] = NS.MATHML;
SCOPING_ELEMENTS[$.ANNOTATION_XML] = NS.MATHML;
SCOPING_ELEMENTS[$.FOREIGN_OBJECT] = NS.SVG;
SCOPING_ELEMENTS[$.DESC] = NS.SVG;
SCOPING_ELEMENTS[$.TITLE] = NS.SVG;

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
    this.items = [];
    this.current = document;
    this.currentTagName = null;
    this.currentNamespaceURI = null;
    this.treeAdapter = treeAdapter;
};

//Element in scope
OpenElementStack.prototype._isScopingElement = function (tagName, namespaceURI) {
    return SCOPING_ELEMENTS[tagName] === namespaceURI;
};

//Index of element
OpenElementStack.prototype._indexOf = function (element) {
    var idx = -1;

    for (var i = this.stackTop; i >= 0; i--) {
        if (this.items[i] === element) {
            idx = i;
            break;
        }
    }
    return idx;
};

//Update current element
OpenElementStack.prototype._updateCurrentElement = function () {
    this.current = this.items[this.stackTop];
    this.currentTagName = this.current && this.treeAdapter.getTagName(this.current);
    this.currentNamespaceURI = this.current && this.treeAdapter.getNamespaceURI(this.current);
};

//Mutations
OpenElementStack.prototype.push = function (element) {
    this.items[++this.stackTop] = element;
    this._updateCurrentElement();
};

OpenElementStack.prototype.pop = function () {
    this.stackTop--;
    this._updateCurrentElement();
};

OpenElementStack.prototype.replace = function (oldElement, newElement) {
    var idx = this._indexOf(oldElement);
    this.items[idx] = newElement;

    if (idx === this.stackTop)
        this._updateCurrentElement();
};

OpenElementStack.prototype.insertAfter = function (referenceElement, newElement) {
    var insertionIdx = this._indexOf(referenceElement) + 1;

    this.items.splice(insertionIdx, 0, newElement);

    if (insertionIdx == ++this.stackTop)
        this._updateCurrentElement();
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
    this._updateCurrentElement();
};

OpenElementStack.prototype.clearBackToNonForeignContext = function () {
    while (this.currentNamespaceURI !== NS.HTML && !this.isMathMLTextIntegrationPoint() && !this.isHtmlIntegrationPoint())
        this.pop();
};

OpenElementStack.prototype.clearBackToTableContext = function () {
    while (this.currentTagName !== $.TABLE && this.currentTagName !== $.HTML)
        this.pop();
};

OpenElementStack.prototype.clearBackToTableBodyContext = function () {
    while (this.currentTagName !== $.TBODY && this.currentTagName !== $.TFOOT &&
           this.currentTagName !== $.THEAD && this.currentTagName !== $.HTML) {
        this.pop();
    }
};

OpenElementStack.prototype.clearBackToTableRowContext = function () {
    while (this.currentTagName !== $.TR && this.currentTagName !== $.HTML)
        this.pop();
};

OpenElementStack.prototype.remove = function (element) {
    for (var i = this.stackTop; i >= 0; i--) {
        if (this.items[i] === element) {
            this.items.splice(i, 1);
            this.stackTop--;
            this._updateCurrentElement();
            break;
        }
    }
};

//Search
OpenElementStack.prototype.tryPeekProperlyNestedBodyElement = function () {
    //Properly nested <body> element (should be second element in stack).
    var element = this.items[1];
    return element && this.treeAdapter.getTagName(element) === $.BODY ? element : null;
};

OpenElementStack.prototype.contains = function (element) {
    return this._indexOf(element) > -1;
};

OpenElementStack.prototype.getCommonAncestor = function (element) {
    var elementIdx = this._indexOf(element);

    return --elementIdx >= 0 ? this.items[elementIdx] : null;
};

OpenElementStack.prototype.isRootHtmlElementCurrent = function () {
    return this.stackTop === 0 && this.currentTagName === $.HTML;
};

//Element in scope
OpenElementStack.prototype.hasInScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if (this._isScopingElement(tn, ns))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasNumberedHeaderInScope = function () {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === $.H1 || tn === $.H2 || tn === $.H3 || tn === $.H4 || tn === $.H5 || tn === $.H6)
            return true;

        if (this._isScopingElement(tn, this.treeAdapter.getNamespaceURI(this.items[i])))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInListItemScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if (((tn === $.UL || tn === $.OL) && ns === NS.HTML) || this._isScopingElement(tn, ns))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInButtonScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if ((tn === $.BUTTON && ns === NS.HTML) || this._isScopingElement(tn, ns))
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInTableScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if ((tn === $.TABLE || tn === $.HTML) && ns === NS.HTML)
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasTableBodyContextInTableScope = function () {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === $.TBODY || tn === $.THEAD || tn === $.TFOOT)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if ((tn === $.TABLE || tn === $.HTML) && ns === NS.HTML)
            return false;
    }

    return true;
};

OpenElementStack.prototype.hasInSelectScope = function (tagName) {
    for (var i = this.stackTop; i >= 0; i--) {
        var tn = this.treeAdapter.getTagName(this.items[i]);

        if (tn === tagName)
            return true;

        var ns = this.treeAdapter.getNamespaceURI(this.items[i]);

        if (tn !== $.OPTION && tn !== $.OPTGROUP && ns === NS.HTML)
            return false;
    }

    return true;
};

//Integration points
OpenElementStack.prototype.isMathMLTextIntegrationPoint = function () {
    return this.currentNamespaceURI === NS.MATHML &&
           (this.currentTagName === $.MI || this.currentTagName === $.MO ||
            this.currentTagName === $.MN || this.currentTagName === $.MS ||
            this.currentTagName === $.MTEXT);
};

OpenElementStack.prototype.isHtmlIntegrationPoint = function () {
    if (this.currentNamespaceURI === NS.MATHML && this.currentTagName === $.ANNOTATION_XML) {
        var attrs = this.treeAdapter.getAttrList(this.current);

        for (var i = 0; i < attrs.length; i++) {
            if (attrs[i].name === ENCODING_ATTR) {
                var value = attrs[i].value.toLowerCase();

                if (value === APPLICATION_XML_MIME_TYPE || value === TEXT_HTML_MIME_TYPE)
                    return true;
            }
        }
    }

    return this.currentNamespaceURI === NS.SVG &&
           (this.currentTagName === $.FOREIGN_OBJECT ||
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

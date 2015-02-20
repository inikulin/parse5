'use strict';

//NOTE: patch open elements stack, so we can assign end location for the elements
function patchOpenElementsStack(stack, parser) {
    var stackProto = Object.getPrototypeOf(stack);

    function setEndLocation(elementIdx) {
        var element = stack.items[elementIdx];

        if (element.__location)
            element.__location.end = parser.tokenizer.lastProvidedToken.location.end;
    }

    stack.pop = function () {
        setEndLocation(this.stackTop);
        stackProto.pop.call(this);
    };

    stack.popAllUpToHtmlElement = function () {
        for (var i = this.stackTop; i > 0; i--)
            setEndLocation(i);

        stackProto.popAllUpToHtmlElement.call(this);
    };
}

exports.assign = function (parser) {
    var parserProto = Object.getPrototypeOf(parser);

    //NOTE: patch _reset method
    parser._reset = function (html, document, fragmentContext) {
        parserProto._reset.call(this, html, document, fragmentContext);
        this.attachableElementLocation = null;
        patchOpenElementsStack(this.openElements, parser);
    };

    //NOTE: at first we need to assign node's location on it's creation using appropriate token's location info

    //Doctype
    parser._setDocumentType = function (token) {
        parserProto._setDocumentType.call(this, token);

        var documentChildren = this.treeAdapter.getChildNodes(this.document),
            cnLength = documentChildren.length;

        for (var i = 0; i < cnLength; i++) {
            var node = documentChildren[i];

            if (this.treeAdapter.isDocumentTypeNode(node)) {
                node.__location = token.location;
                break;
            }
        }
    };

    //Elements
    parser._attachElementToTree = function (element) {
        //NOTE: _attachElementToTree is called from _appendElement, _insertElement and _insertTemplate methods.
        //So we will use token location stored in this methods for the element.
        element.__location = this.attachableElementLocation || null;
        this.attachableElementLocation = null;
        parserProto._attachElementToTree.call(this, element);
    };

    parser._appendElement = function (token, namespaceURI) {
        this.attachableElementLocation = token.location;
        parserProto._appendElement.call(this, token, namespaceURI);
    };

    parser._insertElement = function (token, namespaceURI) {
        this.attachableElementLocation = token.location;
        parserProto._insertElement.call(this, token, namespaceURI);
    };

    parser._insertTemplate = function (token) {
        this.attachableElementLocation = token.location;
        parserProto._insertTemplate.call(this, token);

        var tmplContent = this.treeAdapter.getChildNodes(this.openElements.current)[0];

        tmplContent.__location = null;
    };

    parser._insertFakeRootElement = function () {
        parserProto._insertFakeRootElement.call(this);
        this.openElements.current.__location = null;
    };

    //Comments
    parser._appendCommentNode = function (token, parent) {
        parserProto._appendCommentNode.call(this, token, parent);

        var children = this.treeAdapter.getChildNodes(parent),
            commentNode = children[children.length - 1];

        commentNode.__location = token.location;
    };

    //Text
    //NOTE: store last foster parenting location, so we will be able to find inserted text
    //in case of foster parenting
    //TODO

    parser._insertCharacters = function (token) {
        parserProto._insertCharacters.call(this, token);

        if (!this._shouldFosterParentOnInsertion()) {
            var parent = this.openElements.currentTmplContent || this.openElements.current,
                children = this.treeAdapter.getChildNodes(parent),
                textNode = children[children.length - 1];
        }
    };
};


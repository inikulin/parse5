exports.assign = function (parser) {
    var parserProto = Object.getPrototypeOf(parser);

    //NOTE: patch _reset method
    parser._reset = function (html, document, fragmentContext) {
        parserProto._reset.call(this, html, document, fragmentContext);
        this.attachableElementLocation = null;
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
                node.location = token.location;
                break;
            }
        }
    };

    //Elements
    //NOTE: _attachElementToTree is called from _appendElement, _insertElement and _insertTemplate methods.
    //So we will use token location stored in this methods for the element.
    parser._attachElementToTree = function (element) {
        element.location = this.attachableElementLocation;
        this.attachableElementLocation = null;
        parserProto._attachElementToTree.call(this, element);
    };

    parser._appendElement = function (token, namespaceURI) {
        this.attachableElementLocation = token.location || null;
        parserProto._appendElement.call(this, token, namespaceURI);
    };
};

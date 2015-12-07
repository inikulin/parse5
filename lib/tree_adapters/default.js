'use strict';

/**
 * @typedef {Object} TreeAdapter
 */

//Node construction

/**
 * Creates document node
 *
 * @function createDocument
 * @memberof TreeAdapter
 *
 * @returns {ASTNode<Document>} document
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L19|default implementation.}
 */
exports.createDocument = function () {
    return {
        nodeName: '#document',
        quirksMode: false,
        childNodes: []
    };
};

/**
 * Creates document fragment node
 *
 * @function createDocumentFragment
 * @memberof TreeAdapter
 *
 * @returns {ASTNode<DocumentFragment>} fragment
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L37|default implementation.}
 */
exports.createDocumentFragment = function () {
    return {
        nodeName: '#document-fragment',
        quirksMode: false,
        childNodes: []
    };
};


/**
 * Creates element node
 *
 * @function createElement
 * @memberof TreeAdapter
 *
 * @param {String} tagName - Tag name of the element.
 * @param {String} namespaceURI - Namespace of the element.
 * @param {Array}  attrs - Attribute name-value pair array.
 *                         Foreign attributes may contain `namespace` and `prefix` fields as well.
 *
 * @returns {ASTNode<Element>} element
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L61|default implementation.}
 */
exports.createElement = function (tagName, namespaceURI, attrs) {
    return {
        nodeName: tagName,
        tagName: tagName,
        attrs: attrs,
        namespaceURI: namespaceURI,
        childNodes: [],
        parentNode: null
    };
};


/**
 * Creates comment node
 *
 * @function createElement
 * @memberof TreeAdapter
 *
 * @param {String} data - Comment text.
 *
 * @returns {ASTNode<CommentNode>} comment
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L85|default implementation.}
 */
exports.createCommentNode = function (data) {
    return {
        nodeName: '#comment',
        data: data,
        parentNode: null
    };
};

var createTextNode = function (value) {
    return {
        nodeName: '#text',
        value: value,
        parentNode: null
    };
};


//Tree mutation
/**
 * Appends child node to the given parent node.
 *
 * @function appendChild
 * @memberof TreeAdapter
 *
 * @param {ASTNode} parentNode - Parent node.
 * @param {ASTNode} newNode -  Child node.
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L131|default implementation.}
 */
var appendChild = exports.appendChild = function (parentNode, newNode) {
    parentNode.childNodes.push(newNode);
    newNode.parentNode = parentNode;
};

/**
 * Inserts child node to the given parent node before the given reference node.
 *
 * @function insertBefore
 * @memberof TreeAdapter
 *
 * @param {ASTNode} parentNode - Parent node.
 * @param {ASTNode} newNode -  Child node.
 * @param {ASTNode} referenceNode -  Reference node.
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L131|default implementation.}
 */
var insertBefore = exports.insertBefore = function (parentNode, newNode, referenceNode) {
    var insertionIdx = parentNode.childNodes.indexOf(referenceNode);

    parentNode.childNodes.splice(insertionIdx, 0, newNode);
    newNode.parentNode = parentNode;
};

/**
 * Sets <template> element content element.
 *
 * @function setTemplateContent
 * @memberof TreeAdapter
 *
 * @param {ASTNode<TemplateElement>} templateElement - <template> element.
 * @param {ASTNode<DocumentFragment>} contentTemplate -  Content element.
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L131|default implementation.}
 */
exports.setTemplateContent = function (templateElement, contentElement) {
    templateElement.content = contentElement;
};


/**
 * Returns <template> element content element.
 *
 * @function getTemplateContent
 * @memberof TreeAdapter
 *
 * @param {ASTNode<DocumentFragment>} templateElement - <template> element.

 * @returns {Boolean}
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L183|default implementation.}
 */
exports.getTemplateContent = function (templateElement) {
    return templateElement.content;
};

/**
 * Sets document type. If `document` already have document type node in it then
 * `name`, `publicId` and `systemId` properties of the node will be updated with
 * the provided values. Otherwise, creates new document type node with the given
 * properties and inserts it into `document`.
 *
 * @function setDocumentType
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Document>} document - Document node.
 * @param {String} name -  Document type name.
 * @param {String} publicId - Document type public identifier.
 * @param {String} systemId - Document type system identifier.
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L131|default implementation.}
 */
exports.setDocumentType = function (document, name, publicId, systemId) {
    var doctypeNode = null;

    for (var i = 0; i < document.childNodes.length; i++) {
        if (document.childNodes[i].nodeName === '#documentType') {
            doctypeNode = document.childNodes[i];
            break;
        }
    }

    if (doctypeNode) {
        doctypeNode.name = name;
        doctypeNode.publicId = publicId;
        doctypeNode.systemId = systemId;
    }

    else {
        appendChild(document, {
            nodeName: '#documentType',
            name: name,
            publicId: publicId,
            systemId: systemId
        });
    }
};

/**
 * Sets document quirks mode flag.
 *
 * @function setQuirksMode
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Document>} document - Document node.
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L167|default implementation.}
 */
exports.setQuirksMode = function (document) {
    document.quirksMode = true;
};

/**
 * Determines if document quirks mode flag is set.
 *
 * @function setQuirksMode
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Document>} document - Document node.

 * @returns {Boolean}
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L183|default implementation.}
 */
exports.isQuirksMode = function (document) {
    return document.quirksMode;
};

/**
 * Removes node from it's parent.
 *
 * @function detachNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.

 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L197|default implementation.}
 */
exports.detachNode = function (node) {
    if (node.parentNode) {
        var idx = node.parentNode.childNodes.indexOf(node);

        node.parentNode.childNodes.splice(idx, 1);
        node.parentNode = null;
    }
};

/**
 * Inserts text into node. If the last child of the node is the text node then
 * provided text will be appended to the text node content. Otherwise, inserts
 * new text node with the given text.
 *
 *
 * @function insertText
 * @memberof TreeAdapter
 *
 * @param {ASTNode} parentNode - Node to insert text into.
 * @param {String} text - Text to insert.

 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L220|default implementation.}
 */
exports.insertText = function (parentNode, text) {
    if (parentNode.childNodes.length) {
        var prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];

        if (prevNode.nodeName === '#text') {
            prevNode.value += text;
            return;
        }
    }

    appendChild(parentNode, createTextNode(text));
};

/**
 * Inserts text into node before the referenced child node. If node before the
 * referenced child node is the text node then provided text will be appended
 * to the text node content. Otherwise, inserts new text node with the given text
 * before the referenced child node.
 *
 *
 * @function insertTextBefore
 * @memberof TreeAdapter
 *
 * @param {ASTNode} parentNode - Node to insert text into.
 * @param {String} text - Text to insert.
 * @param {ASTNode} referenceNode - Node to insert text before.
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L249|default implementation.}
 */
exports.insertTextBefore = function (parentNode, text, referenceNode) {
    var prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.nodeName === '#text')
        prevNode.value += text;
    else
        insertBefore(parentNode, createTextNode(text), referenceNode);
};

/**
 * Copies attributes to the given node. Only those nodes
 * which are not yet present in the node are copied.
 *
 * @function adoptAttributes
 * @memberof TreeAdapter
 *
 * @param {ASTNode} recipientNode - Node to copy attributes into.
 * @param {Array} attrs - Attributes to copy.

 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L270|default implementation.}
 */
exports.adoptAttributes = function (recipientNode, attrs) {
    var recipientAttrsMap = [];

    for (var i = 0; i < recipientNode.attrs.length; i++)
        recipientAttrsMap.push(recipientNode.attrs[i].name);

    for (var j = 0; j < attrs.length; j++) {
        if (recipientAttrsMap.indexOf(attrs[j].name) === -1)
            recipientNode.attrs.push(attrs[j]);
    }
};


//Tree traversing

/**
 * Returns first child of the given node.
 *
 * @function getFirstChild
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {ASTNode} firstChild
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L297|default implementation.}
 */
exports.getFirstChild = function (node) {
    return node.childNodes[0];
};

/**
 * Returns array of the given node's children.
 *
 * @function getChildNodes
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Array} children
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L313|default implementation.}
 */
exports.getChildNodes = function (node) {
    return node.childNodes;
};

/**
 * Returns given node's parent.
 *
 * @function getParentNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {ASTNode} parent
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L329|default implementation.}
 */
exports.getParentNode = function (node) {
    return node.parentNode;
};

/**
 * Returns array of the given node's attributes in form of the name-value pair.
 * Foreign attributes may contain `namespace` and `prefix` fields as well.
 *
 * @function getAttrList
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Array} attributes
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L346|default implementation.}
 */
exports.getAttrList = function (node) {
    return node.attrs;
};

//Node data

/**
 * Returns given element's tag name.
 *
 * @function getTagName
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Element>} element - Element.
 *
 * @returns {String} tagName
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L364|default implementation.}
 */
exports.getTagName = function (element) {
    return element.tagName;
};

/**
 * Returns given element's namespace.
 *
 * @function getNamespaceURI
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Element>} element - Element.
 *
 * @returns {String} namespaceURI
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L380|default implementation.}
 */
exports.getNamespaceURI = function (element) {
    return element.namespaceURI;
};

/**
 * Returns given text node's content.
 *
 * @function getTextNodeContent
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Text>} textNode - Text node.
 *
 * @returns {String} text
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L396|default implementation.}
 */
exports.getTextNodeContent = function (textNode) {
    return textNode.value;
};

/**
 * Returns given comment node's content.
 *
 * @function getTextNodeContent
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Comment>} commentNode - Comment node.
 *
 * @returns {String} commentText
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L412|default implementation.}
 */
exports.getCommentNodeContent = function (commentNode) {
    return commentNode.data;
};

/**
 * Returns given document type node's name.
 *
 * @function getDocumentTypeNodeName
 * @memberof TreeAdapter
 *
 * @param {ASTNode<DocumentType>} doctypeNode - Document type node.
 *
 * @returns {String} name
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L428|default implementation.}
 */
exports.getDocumentTypeNodeName = function (doctypeNode) {
    return doctypeNode.name;
};

/**
 * Returns given document type node's public identifier.
 *
 * @function getDocumentTypeNodePublicId
 * @memberof TreeAdapter
 *
 * @param {ASTNode<DocumentType>} doctypeNode - Document type node.
 *
 * @returns {String} publicId
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L444|default implementation.}
 */
exports.getDocumentTypeNodePublicId = function (doctypeNode) {
    return doctypeNode.publicId;
};

/**
 * Returns given document type node's system identifier.
 *
 * @function getDocumentTypeNodeSystemId
 * @memberof TreeAdapter
 *
 * @param {ASTNode<DocumentType>} doctypeNode - Document type node.
 *
 * @returns {String} systemId
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L460|default implementation.}
 */
exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
    return doctypeNode.systemId;
};

//Node types
/**
 * Determines if given node is a text node.
 *
 * @function isTextNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Boolean}
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L477|default implementation.}
 */
exports.isTextNode = function (node) {
    return node.nodeName === '#text';
};

/**
 * Determines if given node is a comment node.
 *
 * @function isCommentNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Boolean}
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L493|default implementation.}
 */
exports.isCommentNode = function (node) {
    return node.nodeName === '#comment';
};

/**
 * Determines if given node is a document type node.
 *
 * @function isDocumentTypeNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Boolean}
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L509|default implementation.}
 */
exports.isDocumentTypeNode = function (node) {
    return node.nodeName === '#documentType';
};

/**
 * Determines if given node is an element.
 *
 * @function isElementNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Boolean}
 *
 * @see {@link https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L525|default implementation.}
 */
exports.isElementNode = function (node) {
    return !!node.tagName;
};

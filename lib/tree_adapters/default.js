'use strict';

var DOCUMENT_MODE = require('../common/html').DOCUMENT_MODE;

/**
 * @typedef {Object} TreeAdapter
 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters/default.js|default implementation.}
 */

//Node construction

/**
 * Creates a document node.
 *
 * @function createDocument
 * @memberof TreeAdapter
 *
 * @returns {ASTNode<Document>} document
 *
 */
exports.createDocument = function () {
    return {
        nodeName: '#document',
        mode: DOCUMENT_MODE.NO_QUIRKS,
        childNodes: []
    };
};

/**
 * Creates a document fragment node.
 *
 * @function createDocumentFragment
 * @memberof TreeAdapter
 *
 * @returns {ASTNode<DocumentFragment>} fragment
 *
 */
exports.createDocumentFragment = function () {
    return {
        nodeName: '#document-fragment',
        childNodes: []
    };
};


/**
 * Creates an element node.
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
 * Creates a comment node.
 *
 * @function createCommentNode
 * @memberof TreeAdapter
 *
 * @param {String} data - Comment text.
 *
 * @returns {ASTNode<CommentNode>} comment
 *
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
 * Appends a child node to the given parent node.
 *
 * @function appendChild
 * @memberof TreeAdapter
 *
 * @param {ASTNode} parentNode - Parent node.
 * @param {ASTNode} newNode -  Child node.
 *
 */
var appendChild = exports.appendChild = function (parentNode, newNode) {
    parentNode.childNodes.push(newNode);
    newNode.parentNode = parentNode;
};

/**
 * Inserts a child node to the given parent node before the given reference node.
 *
 * @function insertBefore
 * @memberof TreeAdapter
 *
 * @param {ASTNode} parentNode - Parent node.
 * @param {ASTNode} newNode -  Child node.
 * @param {ASTNode} referenceNode -  Reference node.
 *
 */
var insertBefore = exports.insertBefore = function (parentNode, newNode, referenceNode) {
    var insertionIdx = parentNode.childNodes.indexOf(referenceNode);

    parentNode.childNodes.splice(insertionIdx, 0, newNode);
    newNode.parentNode = parentNode;
};

/**
 * Sets the `<template>` element content element.
 *
 * @function setTemplateContent
 * @memberof TreeAdapter
 *
 * @param {ASTNode<TemplateElement>} templateElement - `<template>` element.
 * @param {ASTNode<DocumentFragment>} contentTemplate -  Content element.
 *
 */
exports.setTemplateContent = function (templateElement, contentElement) {
    templateElement.content = contentElement;
};


/**
 * Returns the `<template>` element content element.
 *
 * @function getTemplateContent
 * @memberof TreeAdapter
 *
 * @param {ASTNode<TemplateElement>} templateElement - `<template>` element.

 * @returns {ASTNode<DocumentFragment>}
 *
 */
exports.getTemplateContent = function (templateElement) {
    return templateElement.content;
};

/**
 * Sets the document type. If the `document` already contains a document type node, the `name`, `publicId` and `systemId`
 * properties of this node will be updated with the provided values. Otherwise, creates a new document type node
 * with the given properties and inserts it into the `document`.
 *
 * @function setDocumentType
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Document>} document - Document node.
 * @param {String} name -  Document type name.
 * @param {String} publicId - Document type public identifier.
 * @param {String} systemId - Document type system identifier.
 *
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
 * Sets the {@link https://dom.spec.whatwg.org/#concept-document-limited-quirks|document mode}.
 *
 * @function setDocumentMode
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Document>} document - Document node.
 * @param {String} mode - Document mode.
 *
 */
exports.setDocumentMode = function (document, mode) {
    document.mode = mode;
};

/**
 * Returns {@link https://dom.spec.whatwg.org/#concept-document-limited-quirks|document mode}.
 *
 * @function getDocumentMode
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Document>} document - Document node.
 * @returns {String} mode
 *
 */
exports.getDocumentMode = function (document) {
    return document.mode;
};

/**
 * Removes a node from its parent.
 *
 * @function detachNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 */
exports.detachNode = function (node) {
    if (node.parentNode) {
        var idx = node.parentNode.childNodes.indexOf(node);

        node.parentNode.childNodes.splice(idx, 1);
        node.parentNode = null;
    }
};

/**
 * Inserts text into a node. If the last child of the node is a text node, the provided text will be appended to the
 * text node content. Otherwise, inserts a new text node with the given text.
 *
 *
 * @function insertText
 * @memberof TreeAdapter
 *
 * @param {ASTNode} parentNode - Node to insert text into.
 * @param {String} text - Text to insert.
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
 * Inserts text into a sibling node that goes before the reference node. If this sibling node is the text node,
 * the provided text will be appended to the text node content. Otherwise, inserts a new sibling text node with
 * the given text before the reference node.
 *
 *
 * @function insertTextBefore
 * @memberof TreeAdapter
 *
 * @param {ASTNode} parentNode - Node to insert text into.
 * @param {String} text - Text to insert.
 * @param {ASTNode} referenceNode - Node to insert text before.
 *
 */
exports.insertTextBefore = function (parentNode, text, referenceNode) {
    var prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.nodeName === '#text')
        prevNode.value += text;
    else
        insertBefore(parentNode, createTextNode(text), referenceNode);
};

/**
 * Copies attributes to the given node. Only attributes that are not yet present in the node are copied.
 *
 * @function adoptAttributes
 * @memberof TreeAdapter
 *
 * @param {ASTNode} recipientNode - Node to copy attributes into.
 * @param {Array} attrs - Attributes to copy.
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
 * Returns the first child of the given node.
 *
 * @function getFirstChild
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {ASTNode} firstChild
 *
 */
exports.getFirstChild = function (node) {
    return node.childNodes[0];
};

/**
 * Returns the given node's children in an array.
 *
 * @function getChildNodes
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Array} children
 *
 */
exports.getChildNodes = function (node) {
    return node.childNodes;
};

/**
 * Returns the given node's parent.
 *
 * @function getParentNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {ASTNode} parent
 *
 */
exports.getParentNode = function (node) {
    return node.parentNode;
};

/**
 * Returns the given node's attributes in an array, in the form of name-value pairs.
 * Foreign attributes may contain `namespace` and `prefix` fields as well.
 *
 * @function getAttrList
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Array} attributes
 *
 */
exports.getAttrList = function (node) {
    return node.attrs;
};

//Node data

/**
 * Returns the given element's tag name.
 *
 * @function getTagName
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Element>} element - Element.
 *
 * @returns {String} tagName
 *
 */
exports.getTagName = function (element) {
    return element.tagName;
};

/**
 * Returns the given element's namespace.
 *
 * @function getNamespaceURI
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Element>} element - Element.
 *
 * @returns {String} namespaceURI
 *
 */
exports.getNamespaceURI = function (element) {
    return element.namespaceURI;
};

/**
 * Returns the given text node's content.
 *
 * @function getTextNodeContent
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Text>} textNode - Text node.
 *
 * @returns {String} text
 *
 */
exports.getTextNodeContent = function (textNode) {
    return textNode.value;
};

/**
 * Returns the given comment node's content.
 *
 * @function getCommentNodeContent
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Comment>} commentNode - Comment node.
 *
 * @returns {String} commentText
 *
 */
exports.getCommentNodeContent = function (commentNode) {
    return commentNode.data;
};

/**
 * Returns the given document type node's name.
 *
 * @function getDocumentTypeNodeName
 * @memberof TreeAdapter
 *
 * @param {ASTNode<DocumentType>} doctypeNode - Document type node.
 *
 * @returns {String} name
 *
 */
exports.getDocumentTypeNodeName = function (doctypeNode) {
    return doctypeNode.name;
};

/**
 * Returns the given document type node's public identifier.
 *
 * @function getDocumentTypeNodePublicId
 * @memberof TreeAdapter
 *
 * @param {ASTNode<DocumentType>} doctypeNode - Document type node.
 *
 * @returns {String} publicId
 *
 */
exports.getDocumentTypeNodePublicId = function (doctypeNode) {
    return doctypeNode.publicId;
};

/**
 * Returns the given document type node's system identifier.
 *
 * @function getDocumentTypeNodeSystemId
 * @memberof TreeAdapter
 *
 * @param {ASTNode<DocumentType>} doctypeNode - Document type node.
 *
 * @returns {String} systemId
 *
 */
exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
    return doctypeNode.systemId;
};

//Node types
/**
 * Determines if the given node is a text node.
 *
 * @function isTextNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Boolean}
 *
 */
exports.isTextNode = function (node) {
    return node.nodeName === '#text';
};

/**
 * Determines if the given node is a comment node.
 *
 * @function isCommentNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Boolean}
 *
 */
exports.isCommentNode = function (node) {
    return node.nodeName === '#comment';
};

/**
 * Determines if the given node is a document type node.
 *
 * @function isDocumentTypeNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Boolean}
 *
 */
exports.isDocumentTypeNode = function (node) {
    return node.nodeName === '#documentType';
};

/**
 * Determines if the given node is an element.
 *
 * @function isElementNode
 * @memberof TreeAdapter
 *
 * @param {ASTNode} node - Node.
 *
 * @returns {Boolean}
 *
 */
exports.isElementNode = function (node) {
    return !!node.tagName;
};

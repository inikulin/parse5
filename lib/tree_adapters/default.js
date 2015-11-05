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
 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters|sample implementation.}
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
 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters|sample implementation.}
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
 * @param {string} tagName - Tag name of the element.
 * @param {string} namespaceURI - Namespace of the element.
 * @param {Array}  attrs - Element attribute-value pair array.
 *                         Foreign attributes may contain `namespace` and `prefix` fields as well.
 *
 * @returns {ASTNode<Element>} element
 *
 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters|sample implementation.}
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
 * @param {string} data - Comment text.
 *
 * @returns {ASTNode<CommentNode>} comment
 *
 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters|sample implementation.}
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
var appendChild = exports.appendChild = function (parentNode, newNode) {
    parentNode.childNodes.push(newNode);
    newNode.parentNode = parentNode;
};

var insertBefore = exports.insertBefore = function (parentNode, newNode, referenceNode) {
    var insertionIdx = parentNode.childNodes.indexOf(referenceNode);

    parentNode.childNodes.splice(insertionIdx, 0, newNode);
    newNode.parentNode = parentNode;
};

/**
 * Sets document type. If `document` already have document type node in it then
 * `name`, `publicId` and `systemId` properties of the node should be updated with
 * the provided values. Otherwise, create and new document type node with the given
 * properties and insert it into `document`.
 *
 * @function setDocumentType
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Document>} document - Document node.
 * @param {string} name -  Document type name.
 * @param {string} publicId - Document type public identifier.
 * @param {string} systemId - Document type system identifier.
 *
 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters|sample implementation.}
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
 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters|sample implementation.}
 */
exports.setQuirksMode = function (document) {
    document.quirksMode = true;
};

/**
 * Query document quirks mode flag state.
 *
 * @function setQuirksMode
 * @memberof TreeAdapter
 *
 * @param {ASTNode<Document>} document - Document node.

 * @returns {Boolean} isSet
 *
 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters|sample implementation.}
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

 * @see {@link https://github.com/inikulin/parse5/blob/master/lib/tree_adapters|sample implementation.}
 */
exports.detachNode = function (node) {
    if (node.parentNode) {
        var idx = node.parentNode.childNodes.indexOf(node);

        node.parentNode.childNodes.splice(idx, 1);
        node.parentNode = null;
    }
};

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

exports.insertTextBefore = function (parentNode, text, referenceNode) {
    var prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.nodeName === '#text')
        prevNode.value += text;
    else
        insertBefore(parentNode, createTextNode(text), referenceNode);
};

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
exports.getFirstChild = function (node) {
    return node.childNodes[0];
};

exports.getChildNodes = function (node) {
    return node.childNodes;
};

exports.getParentNode = function (node) {
    return node.parentNode;
};

exports.getAttrList = function (node) {
    return node.attrs;
};

//Node data
exports.getTagName = function (element) {
    return element.tagName;
};

exports.getNamespaceURI = function (element) {
    return element.namespaceURI;
};

exports.getTextNodeContent = function (textNode) {
    return textNode.value;
};

exports.getCommentNodeContent = function (commentNode) {
    return commentNode.data;
};

exports.getDocumentTypeNodeName = function (doctypeNode) {
    return doctypeNode.name;
};

exports.getDocumentTypeNodePublicId = function (doctypeNode) {
    return doctypeNode.publicId;
};

exports.getDocumentTypeNodeSystemId = function (doctypeNode) {
    return doctypeNode.systemId;
};

//Node types
exports.isTextNode = function (node) {
    return node.nodeName === '#text';
};

exports.isCommentNode = function (node) {
    return node.nodeName === '#comment';
};

exports.isDocumentTypeNode = function (node) {
    return node.nodeName === '#documentType';
};

exports.isElementNode = function (node) {
    return !!node.tagName;
};

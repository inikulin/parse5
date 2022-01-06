'use strict';

const doctype = require('parse5/lib/common/doctype');
const { DOCUMENT_MODE } = require('parse5/lib/common/html');
const { NodeWithChildren, Element, ProcessingInstruction, Comment, Text } = require('domhandler');

//Node construction
exports.createDocument = function() {
    const node = new NodeWithChildren('root', []);
    node.name = 'root';
    node['x-mode'] = DOCUMENT_MODE.NO_QUIRKS;
    return node;
};

exports.createDocumentFragment = function() {
    const node = new NodeWithChildren('root', []);
    node.name = 'root';
    return node;
};

exports.createElement = function(tagName, namespaceURI, attrs) {
    const attribs = Object.create(null);
    const attribsNamespace = Object.create(null);
    const attribsPrefix = Object.create(null);

    for (let i = 0; i < attrs.length; i++) {
        const attrName = attrs[i].name;

        attribs[attrName] = attrs[i].value;
        attribsNamespace[attrName] = attrs[i].namespace;
        attribsPrefix[attrName] = attrs[i].prefix;
    }

    const node = new Element(tagName, attribs, []);
    node.namespace = namespaceURI;
    node['x-attribsNamespace'] = attribsNamespace;
    node['x-attribsPrefix'] = attribsPrefix;
    return node;
};

exports.createCommentNode = function(data) {
    return new Comment(data);
};

const createTextNode = function(value) {
    return new Text(value);
};

//Tree mutation
const appendChild = (exports.appendChild = function(parentNode, newNode) {
    const prev = parentNode.children[parentNode.children.length - 1];

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    parentNode.children.push(newNode);
    newNode.parent = parentNode;
});

const insertBefore = (exports.insertBefore = function(parentNode, newNode, referenceNode) {
    const insertionIdx = parentNode.children.indexOf(referenceNode);
    const prev = referenceNode.prev;

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    referenceNode.prev = newNode;
    newNode.next = referenceNode;

    parentNode.children.splice(insertionIdx, 0, newNode);
    newNode.parent = parentNode;
});

exports.setTemplateContent = function(templateElement, contentElement) {
    appendChild(templateElement, contentElement);
};

exports.getTemplateContent = function(templateElement) {
    return templateElement.children[0];
};

exports.setDocumentType = function(document, name, publicId, systemId) {
    const data = doctype.serializeContent(name, publicId, systemId);
    let doctypeNode = null;

    for (let i = 0; i < document.children.length; i++) {
        if (document.children[i].type === 'directive' && document.children[i].name === '!doctype') {
            doctypeNode = document.children[i];
            break;
        }
    }

    if (doctypeNode) {
        doctypeNode.data = data;
        doctypeNode['x-name'] = name;
        doctypeNode['x-publicId'] = publicId;
        doctypeNode['x-systemId'] = systemId;
    } else {
        const node = new ProcessingInstruction('!doctype', data);
        node['x-name'] = name;
        node['x-publicId'] = publicId;
        node['x-systemId'] = systemId;
        appendChild(document, node);
    }
};

exports.setDocumentMode = function(document, mode) {
    document['x-mode'] = mode;
};

exports.getDocumentMode = function(document) {
    return document['x-mode'];
};

exports.detachNode = function(node) {
    if (node.parent) {
        const idx = node.parent.children.indexOf(node);
        const prev = node.prev;
        const next = node.next;

        node.prev = null;
        node.next = null;

        if (prev) {
            prev.next = next;
        }

        if (next) {
            next.prev = prev;
        }

        node.parent.children.splice(idx, 1);
        node.parent = null;
    }
};

exports.insertText = function(parentNode, text) {
    const lastChild = parentNode.children[parentNode.children.length - 1];

    if (lastChild && lastChild.type === 'text') {
        lastChild.data += text;
    } else {
        appendChild(parentNode, createTextNode(text));
    }
};

exports.insertTextBefore = function(parentNode, text, referenceNode) {
    const prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.type === 'text') {
        prevNode.data += text;
    } else {
        insertBefore(parentNode, createTextNode(text), referenceNode);
    }
};

exports.adoptAttributes = function(recipient, attrs) {
    for (let i = 0; i < attrs.length; i++) {
        const attrName = attrs[i].name;

        if (typeof recipient.attribs[attrName] === 'undefined') {
            recipient.attribs[attrName] = attrs[i].value;
            recipient['x-attribsNamespace'][attrName] = attrs[i].namespace;
            recipient['x-attribsPrefix'][attrName] = attrs[i].prefix;
        }
    }
};

//Tree traversing
exports.getFirstChild = function(node) {
    return node.children[0];
};

exports.getChildNodes = function(node) {
    return node.children;
};

exports.getParentNode = function(node) {
    return node.parent;
};

exports.getAttrList = function(element) {
    const attrList = [];

    for (const name in element.attribs) {
        attrList.push({
            name: name,
            value: element.attribs[name],
            namespace: element['x-attribsNamespace'][name],
            prefix: element['x-attribsPrefix'][name]
        });
    }

    return attrList;
};

//Node data
exports.getTagName = function(element) {
    return element.name;
};

exports.getNamespaceURI = function(element) {
    return element.namespace;
};

exports.getTextNodeContent = function(textNode) {
    return textNode.data;
};

exports.getCommentNodeContent = function(commentNode) {
    return commentNode.data;
};

exports.getDocumentTypeNodeName = function(doctypeNode) {
    return doctypeNode['x-name'];
};

exports.getDocumentTypeNodePublicId = function(doctypeNode) {
    return doctypeNode['x-publicId'];
};

exports.getDocumentTypeNodeSystemId = function(doctypeNode) {
    return doctypeNode['x-systemId'];
};

//Node types
exports.isTextNode = function(node) {
    return node.type === 'text';
};

exports.isCommentNode = function(node) {
    return node.type === 'comment';
};

exports.isDocumentTypeNode = function(node) {
    return node.type === 'directive' && node.name === '!doctype';
};

exports.isElementNode = function(node) {
    return !!node.attribs;
};

// Source code location
exports.setNodeSourceCodeLocation = function(node, location) {
    node.sourceCodeLocation = location;
};

exports.getNodeSourceCodeLocation = function(node) {
    return node.sourceCodeLocation;
};

exports.updateNodeSourceCodeLocation = function(node, endLocation) {
    node.sourceCodeLocation = Object.assign(node.sourceCodeLocation, endLocation);
};

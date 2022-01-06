'use strict';

import * as doctype from 'parse5/lib/common/doctype.js';
import { DOCUMENT_MODE } from 'parse5/lib/common/html.js';
import { NodeWithChildren, Element, ProcessingInstruction, Comment, Text } from 'domhandler';

//Node construction
export function createDocument() {
    const node = new NodeWithChildren('root', []);
    node.name = 'root';
    node['x-mode'] = DOCUMENT_MODE.NO_QUIRKS;
    return node;
}

export function createDocumentFragment() {
    const node = new NodeWithChildren('root', []);
    node.name = 'root';
    return node;
}

export function createElement(tagName, namespaceURI, attrs) {
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
}

export function createCommentNode(data) {
    return new Comment(data);
}

function createTextNode(value) {
    return new Text(value);
}

//Tree mutation
export function appendChild(parentNode, newNode) {
    const prev = parentNode.children[parentNode.children.length - 1];

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    parentNode.children.push(newNode);
    newNode.parent = parentNode;
}

export function insertBefore(parentNode, newNode, referenceNode) {
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
}

export function setTemplateContent(templateElement, contentElement) {
    appendChild(templateElement, contentElement);
}

export function getTemplateContent(templateElement) {
    return templateElement.children[0];
}

export function setDocumentType(document, name, publicId, systemId) {
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
}

export function setDocumentMode(document, mode) {
    document['x-mode'] = mode;
}

export function getDocumentMode(document) {
    return document['x-mode'];
}

export function detachNode(node) {
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
}

export function insertText(parentNode, text) {
    const lastChild = parentNode.children[parentNode.children.length - 1];

    if (lastChild && lastChild.type === 'text') {
        lastChild.data += text;
    } else {
        appendChild(parentNode, createTextNode(text));
    }
}

export function insertTextBefore(parentNode, text, referenceNode) {
    const prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.type === 'text') {
        prevNode.data += text;
    } else {
        insertBefore(parentNode, createTextNode(text), referenceNode);
    }
}

export function adoptAttributes(recipient, attrs) {
    for (let i = 0; i < attrs.length; i++) {
        const attrName = attrs[i].name;

        if (typeof recipient.attribs[attrName] === 'undefined') {
            recipient.attribs[attrName] = attrs[i].value;
            recipient['x-attribsNamespace'][attrName] = attrs[i].namespace;
            recipient['x-attribsPrefix'][attrName] = attrs[i].prefix;
        }
    }
}

//Tree traversing
export function getFirstChild(node) {
    return node.children[0];
}

export function getChildNodes(node) {
    return node.children;
}

export function getParentNode(node) {
    return node.parent;
}

export function getAttrList(element) {
    const attrList = [];

    for (const name in element.attribs) {
        attrList.push({
            name: name,
            value: element.attribs[name],
            namespace: element['x-attribsNamespace'][name],
            prefix: element['x-attribsPrefix'][name],
        });
    }

    return attrList;
}

//Node data
export function getTagName(element) {
    return element.name;
}

export function getNamespaceURI(element) {
    return element.namespace;
}

export function getTextNodeContent(textNode) {
    return textNode.data;
}

export function getCommentNodeContent(commentNode) {
    return commentNode.data;
}

export function getDocumentTypeNodeName(doctypeNode) {
    return doctypeNode['x-name'];
}

export function getDocumentTypeNodePublicId(doctypeNode) {
    return doctypeNode['x-publicId'];
}

export function getDocumentTypeNodeSystemId(doctypeNode) {
    return doctypeNode['x-systemId'];
}

//Node types
export function isTextNode(node) {
    return node.type === 'text';
}

export function isCommentNode(node) {
    return node.type === 'comment';
}

export function isDocumentTypeNode(node) {
    return node.type === 'directive' && node.name === '!doctype';
}

export function isElementNode(node) {
    return !!node.attribs;
}

// Source code location
export function setNodeSourceCodeLocation(node, location) {
    node.sourceCodeLocation = location;
}

export function getNodeSourceCodeLocation(node) {
    return node.sourceCodeLocation;
}

export function updateNodeSourceCodeLocation(node, endLocation) {
    node.sourceCodeLocation = Object.assign(node.sourceCodeLocation, endLocation);
}

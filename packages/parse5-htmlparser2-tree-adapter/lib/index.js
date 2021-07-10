import { doctype } from 'parse5/lib/common/doctype.js';
import { DOCUMENT_MODE } from 'parse5/lib/common/html.js';

//Conversion tables for DOM Level1 structure emulation
const nodeTypes = {
    element: 1,
    text: 3,
    cdata: 4,
    comment: 8,
};

const nodePropertyShorthands = {
    tagName: 'name',
    childNodes: 'children',
    parentNode: 'parent',
    previousSibling: 'prev',
    nextSibling: 'next',
    nodeValue: 'data',
};

//Node
class Node {
    constructor(props) {
        for (const key of Object.keys(props)) {
            this[key] = props[key];
        }
    }

    get firstChild() {
        const children = this.children;

        return (children && children[0]) || null;
    }

    get lastChild() {
        const children = this.children;

        return (children && children[children.length - 1]) || null;
    }

    get nodeType() {
        return nodeTypes[this.type] || nodeTypes.element;
    }
}

Object.keys(nodePropertyShorthands).forEach((key) => {
    const shorthand = nodePropertyShorthands[key];

    Object.defineProperty(Node.prototype, key, {
        get: function () {
            return this[shorthand] || null;
        },
        set: function (val) {
            this[shorthand] = val;
        },
    });
});

//Node construction
export function createDocument() {
    return new Node({
        type: 'root',
        name: 'root',
        parent: null,
        prev: null,
        next: null,
        children: [],
        'x-mode': DOCUMENT_MODE.NO_QUIRKS,
    });
}

export function createDocumentFragment() {
    return new Node({
        type: 'root',
        name: 'root',
        parent: null,
        prev: null,
        next: null,
        children: [],
    });
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

    return new Node({
        type: tagName === 'script' || tagName === 'style' ? tagName : 'tag',
        name: tagName,
        namespace: namespaceURI,
        attribs: attribs,
        'x-attribsNamespace': attribsNamespace,
        'x-attribsPrefix': attribsPrefix,
        children: [],
        parent: null,
        prev: null,
        next: null,
    });
}

export function createCommentNode(data) {
    return new Node({
        type: 'comment',
        data: data,
        parent: null,
        prev: null,
        next: null,
    });
}

const createTextNode = function (value) {
    return new Node({
        type: 'text',
        data: value,
        parent: null,
        prev: null,
        next: null,
    });
};

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
        appendChild(
            document,
            new Node({
                type: 'directive',
                name: '!doctype',
                data: data,
                'x-name': name,
                'x-publicId': publicId,
                'x-systemId': systemId,
            })
        );
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

export function getCommentNodeWithContent(commentNode) {
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

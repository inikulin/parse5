import { TreeLocation } from './../../parse5/lib/tree-adapters/interface';
import * as doctype from '@parse5/parse5/lib/common/doctype.js';
import { DOCUMENT_MODE, NAMESPACES as NS } from '@parse5/parse5/lib/common/html.js';
import type { Attribute } from '@parse5/parse5/lib/common/token.js';
import type { TreeAdapterTypeMap } from '@parse5/parse5/lib/tree-adapters/interface.js';
import {
    Node,
    NodeWithChildren,
    Element,
    Document,
    ProcessingInstruction,
    Comment,
    Text,
    isDirective,
    isText,
    isComment,
    isTag,
} from 'domhandler';

export type Htmlparser2TreeAdapterMap = TreeAdapterTypeMap<
    Node,
    NodeWithChildren,
    Node,
    Document,
    Document,
    Element,
    Comment,
    Text,
    Element,
    ProcessingInstruction
>;

//Node construction
export function createDocument() {
    const node = new Document([]);
    node['x-mode'] = DOCUMENT_MODE.NO_QUIRKS;
    return node;
}

export function createDocumentFragment() {
    const node = new Document([]);
    return node;
}

export function createElement(tagName: string, namespaceURI: NS, attrs: Attribute[]) {
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
    (node as any).namespace = namespaceURI;
    node['x-attribsNamespace'] = attribsNamespace;
    node['x-attribsPrefix'] = attribsPrefix;
    return node;
}

export function createCommentNode(data: string) {
    return new Comment(data);
}

function createTextNode(value: string) {
    return new Text(value);
}

//Tree mutation
export function appendChild(parentNode: NodeWithChildren, newNode: Node) {
    const prev = parentNode.children[parentNode.children.length - 1];

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    parentNode.children.push(newNode);
    newNode.parent = parentNode;
}

export function insertBefore(parentNode: NodeWithChildren, newNode: Node, referenceNode: Node) {
    const insertionIdx = parentNode.children.indexOf(referenceNode);
    const { prev } = referenceNode;

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    referenceNode.prev = newNode;
    newNode.next = referenceNode;

    parentNode.children.splice(insertionIdx, 0, newNode);
    newNode.parent = parentNode;
}

export function setTemplateContent(templateElement: Element, contentElement: Document) {
    appendChild(templateElement, contentElement);
}

export function getTemplateContent(templateElement: Element) {
    return templateElement.children[0];
}

export function setDocumentType(
    document: Document,
    name: string | null,
    publicId: string | null,
    systemId: string | null
) {
    const data = doctype.serializeContent(name, publicId, systemId);
    const doctypeNode = document.children.find(
        (node) => isDirective(node) && node.name === '!doctype'
    ) as ProcessingInstruction;

    if (doctypeNode) {
        doctypeNode.data = data ?? null;
        doctypeNode['x-name'] = name ?? undefined;
        doctypeNode['x-publicId'] = publicId ?? undefined;
        doctypeNode['x-systemId'] = systemId ?? undefined;
    } else {
        const node = new ProcessingInstruction('!doctype', data);
        node['x-name'] = name ?? undefined;
        node['x-publicId'] = publicId ?? undefined;
        node['x-systemId'] = systemId ?? undefined;
        appendChild(document, node);
    }
}

export function setDocumentMode(document: Document, mode: DOCUMENT_MODE) {
    document['x-mode'] = mode;
}

export function getDocumentMode(document: Document) {
    return document['x-mode'] as DOCUMENT_MODE;
}

export function detachNode(node: Node) {
    if (node.parent) {
        const idx = node.parent.children.indexOf(node);
        const { prev, next } = node;

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

export function insertText(parentNode: NodeWithChildren, text: string) {
    const lastChild = parentNode.children[parentNode.children.length - 1];

    if (lastChild && isText(lastChild)) {
        lastChild.data += text;
    } else {
        appendChild(parentNode, createTextNode(text));
    }
}

export function insertTextBefore(parentNode: NodeWithChildren, text: string, referenceNode: Node) {
    const prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];

    if (prevNode && isText(prevNode)) {
        prevNode.data += text;
    } else {
        insertBefore(parentNode, createTextNode(text), referenceNode);
    }
}

export function adoptAttributes(recipient: Element, attrs: Attribute[]) {
    for (let i = 0; i < attrs.length; i++) {
        const attrName = attrs[i].name;

        if (typeof recipient.attribs[attrName] === 'undefined') {
            recipient.attribs[attrName] = attrs[i].value;
            recipient['x-attribsNamespace']![attrName] = attrs[i].namespace!;
            recipient['x-attribsPrefix']![attrName] = attrs[i].prefix!;
        }
    }
}

//Tree traversing
export function getFirstChild(node: NodeWithChildren) {
    return node.children[0];
}

export function getChildNodes(node: NodeWithChildren) {
    return node.children;
}

export function getParentNode(node: Node) {
    return node.parent;
}

export function getAttrList(element: Element): Attribute[] {
    return element.attributes;
}

//Node data
export function getTagName(element: Element) {
    return element.name;
}

export function getNamespaceURI(element: Element): NS {
    return (element as any).namespace;
}

export function getTextNodeContent(textNode: Text) {
    return textNode.data;
}

export function getCommentNodeContent(commentNode: Comment) {
    return commentNode.data;
}

export function getDocumentTypeNodeName(doctypeNode: ProcessingInstruction) {
    return doctypeNode['x-name'] ?? null;
}

export function getDocumentTypeNodePublicId(doctypeNode: ProcessingInstruction) {
    return doctypeNode['x-publicId'] ?? null;
}

export function getDocumentTypeNodeSystemId(doctypeNode: ProcessingInstruction) {
    return doctypeNode['x-systemId'] ?? null;
}

//Node types
export const isTextNode = isText;
export const isCommentNode = isComment;

export function isDocumentTypeNode(node: Node): node is ProcessingInstruction {
    return isDirective(node) && node.name === '!doctype';
}

export const isElementNode = isTag;

// Source code location
export function setNodeSourceCodeLocation(node: Node, location: TreeLocation | null) {
    if (location) {
        node.startIndex = location.startOffset;
        node.endIndex = location.endOffset;
    }

    (node as any).sourceCodeLocation = location;
}

export function getNodeSourceCodeLocation(node: Node) {
    return (node as any).sourceCodeLocation as TreeLocation | null | undefined;
}

export function updateNodeSourceCodeLocation(node: Node, endLocation: Partial<TreeLocation>) {
    if (endLocation.endOffset != null) node.endIndex = endLocation.endOffset;

    (node as any).sourceCodeLocation = {
        ...(node as any).sourceCodeLocation,
        ...endLocation,
    };
}

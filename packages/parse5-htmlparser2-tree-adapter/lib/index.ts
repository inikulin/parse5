import { type TreeAdapterTypeMap, type TreeAdapter, type Token, html } from 'parse5';
import {
    type AnyNode,
    type ParentNode,
    type ChildNode,
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
    AnyNode,
    ParentNode,
    ChildNode,
    Document,
    Document,
    Element,
    Comment,
    Text,
    Element,
    ProcessingInstruction
>;

function createTextNode(value: string): Text {
    return new Text(value);
}

function enquoteDoctypeId(id: string): string {
    const quote = id.includes('"') ? "'" : '"';

    return quote + id + quote;
}

/** @internal */
export function serializeDoctypeContent(name: string, publicId: string, systemId: string): string {
    let str = '!DOCTYPE ';

    if (name) {
        str += name;
    }

    if (publicId) {
        str += ` PUBLIC ${enquoteDoctypeId(publicId)}`;
    } else if (systemId) {
        str += ' SYSTEM';
    }

    if (systemId) {
        str += ` ${enquoteDoctypeId(systemId)}`;
    }

    return str;
}

export const adapter: TreeAdapter<Htmlparser2TreeAdapterMap> = {
    // Re-exports from domhandler
    isCommentNode: isComment,
    isElementNode: isTag,
    isTextNode: isText,

    //Node construction
    createDocument(): Document {
        const node = new Document([]);
        node['x-mode'] = html.DOCUMENT_MODE.NO_QUIRKS;
        return node;
    },

    createDocumentFragment(): Document {
        return new Document([]);
    },

    createElement(tagName: string, namespaceURI: html.NS, attrs: Token.Attribute[]): Element {
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
    },

    createCommentNode(data: string): Comment {
        return new Comment(data);
    },

    //Tree mutation
    appendChild(parentNode: ParentNode, newNode: ChildNode): void {
        const prev = parentNode.children[parentNode.children.length - 1];

        if (prev) {
            prev.next = newNode;
            newNode.prev = prev;
        }

        parentNode.children.push(newNode);
        newNode.parent = parentNode;
    },

    insertBefore(parentNode: ParentNode, newNode: ChildNode, referenceNode: ChildNode): void {
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
    },

    setTemplateContent(templateElement: Element, contentElement: Document): void {
        adapter.appendChild(templateElement, contentElement as AnyNode as ChildNode);
    },

    getTemplateContent(templateElement: Element): Document {
        return templateElement.children[0] as AnyNode as Document;
    },

    setDocumentType(document: Document, name: string, publicId: string, systemId: string): void {
        const data = serializeDoctypeContent(name, publicId, systemId);
        let doctypeNode = document.children.find(
            (node): node is ProcessingInstruction => isDirective(node) && node.name === '!doctype'
        );

        if (doctypeNode) {
            doctypeNode.data = data ?? null;
        } else {
            doctypeNode = new ProcessingInstruction('!doctype', data);
            adapter.appendChild(document, doctypeNode);
        }

        doctypeNode['x-name'] = name ?? undefined;
        doctypeNode['x-publicId'] = publicId ?? undefined;
        doctypeNode['x-systemId'] = systemId ?? undefined;
    },

    setDocumentMode(document: Document, mode: html.DOCUMENT_MODE): void {
        document['x-mode'] = mode;
    },

    getDocumentMode(document: Document): html.DOCUMENT_MODE {
        return document['x-mode'] as html.DOCUMENT_MODE;
    },

    detachNode(node: ChildNode): void {
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
    },

    insertText(parentNode: ParentNode, text: string): void {
        const lastChild = parentNode.children[parentNode.children.length - 1];

        if (lastChild && isText(lastChild)) {
            lastChild.data += text;
        } else {
            adapter.appendChild(parentNode, createTextNode(text));
        }
    },

    insertTextBefore(parentNode: ParentNode, text: string, referenceNode: ChildNode): void {
        const prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];

        if (prevNode && isText(prevNode)) {
            prevNode.data += text;
        } else {
            adapter.insertBefore(parentNode, createTextNode(text), referenceNode);
        }
    },

    adoptAttributes(recipient: Element, attrs: Token.Attribute[]): void {
        for (let i = 0; i < attrs.length; i++) {
            const attrName = attrs[i].name;

            if (typeof recipient.attribs[attrName] === 'undefined') {
                recipient.attribs[attrName] = attrs[i].value;
                recipient['x-attribsNamespace']![attrName] = attrs[i].namespace!;
                recipient['x-attribsPrefix']![attrName] = attrs[i].prefix!;
            }
        }
    },

    //Tree traversing
    getFirstChild(node: ParentNode): ChildNode | null {
        return node.children[0];
    },

    getChildNodes(node: ParentNode): ChildNode[] {
        return node.children;
    },

    getParentNode(node: AnyNode): ParentNode | null {
        return node.parent;
    },

    getAttrList(element: Element): Token.Attribute[] {
        return element.attributes;
    },

    //Node data
    getTagName(element: Element): string {
        return element.name;
    },

    getNamespaceURI(element: Element): html.NS {
        return element.namespace as html.NS;
    },

    getTextNodeContent(textNode: Text): string {
        return textNode.data;
    },

    getCommentNodeContent(commentNode: Comment): string {
        return commentNode.data;
    },

    getDocumentTypeNodeName(doctypeNode: ProcessingInstruction): string {
        return doctypeNode['x-name'] ?? '';
    },

    getDocumentTypeNodePublicId(doctypeNode: ProcessingInstruction): string {
        return doctypeNode['x-publicId'] ?? '';
    },

    getDocumentTypeNodeSystemId(doctypeNode: ProcessingInstruction): string {
        return doctypeNode['x-systemId'] ?? '';
    },

    //Node types

    isDocumentTypeNode(node: AnyNode): node is ProcessingInstruction {
        return isDirective(node) && node.name === '!doctype';
    },

    // Source code location
    setNodeSourceCodeLocation(node: AnyNode, location: Token.ElementLocation | null): void {
        if (location) {
            node.startIndex = location.startOffset;
            node.endIndex = location.endOffset;
        }

        node.sourceCodeLocation = location;
    },

    getNodeSourceCodeLocation(node: AnyNode): Token.ElementLocation | null | undefined {
        return node.sourceCodeLocation;
    },

    updateNodeSourceCodeLocation(node: AnyNode, endLocation: Token.ElementLocation): void {
        if (endLocation.endOffset != null) node.endIndex = endLocation.endOffset;

        node.sourceCodeLocation = {
            ...node.sourceCodeLocation,
            ...endLocation,
        };
    },
};

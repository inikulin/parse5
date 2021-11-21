import { DOCUMENT_MODE } from '../common/html.js';
import { TreeAdapter } from '../treeAdapter.js';
import { EndLocation, Location, ElementLocation } from '../location.js';
import { DocumentMode } from '../documentMode.js';

const createTextNode = (value: string): TextNode => {
    return {
        nodeName: '#text',
        value: value,
        parentNode: null,
    };
};

const isParentNode = (node: Node): node is ParentNode => {
    return (node as ParentNode).childNodes !== undefined;
};

export interface TextNode {
    nodeName: '#text';
    value: string;
    sourceCodeLocation?: Location | null;
    parentNode: ParentNode | null;
}
export interface DocumentFragment {
    nodeName: '#document-fragment';
    childNodes: Node[];
    parentNode: ParentNode | null;
    sourceCodeLocation?: Location | null;
}
export interface Document {
    nodeName: '#document';
    mode: DocumentMode;
    childNodes: Node[];
    parentNode: ParentNode | null;
    sourceCodeLocation?: Location | null;
}
export interface DocumentType {
    nodeName: '#documentType';
    name: string;
    publicId: string;
    systemId: string;
    parentNode: ParentNode | null;
    sourceCodeLocation?: Location | null;
}
export interface CommentNode {
    nodeName: '#comment';
    data: string;
    sourceCodeLocation?: Location | null;
    parentNode: ParentNode | null;
}
export interface Attribute {
    name: string;
    value: string;
    namespace?: string;
    prefix?: string;
}
export interface Element {
    nodeName: string;
    tagName: string;
    namespaceURI: string;
    attrs: Attribute[];
    sourceCodeLocation?: ElementLocation | null;
    childNodes: Node[];
    parentNode: ParentNode | null;
}
export interface TemplateElement extends Element {
    content: DocumentFragment;
}
export type ParentNode = Document | DocumentFragment | Element;
export type Node = CommentNode | Document | DocumentFragment | DocumentType | Element | TextNode;

export interface DefaultAdapterMap {
    attribute: Attribute;
    commentNode: CommentNode;
    document: Document;
    documentFragment: DocumentFragment;
    documentType: DocumentType;
    element: Element;
    node: Node;
    parentNode: ParentNode;
    textNode: TextNode;
}

export class DefaultTreeAdapter implements TreeAdapter<DefaultAdapterMap> {
    public createDocument(): Document {
        return {
            nodeName: '#document',
            mode: DOCUMENT_MODE.NO_QUIRKS,
            childNodes: [],
            parentNode: null,
        };
    }

    public createDocumentFragment(): DocumentFragment {
        return {
            nodeName: '#document-fragment',
            childNodes: [],
            parentNode: null,
        };
    }

    public createElement(tagName: string, namespaceURI: string, attrs: Attribute[]): Element {
        return {
            nodeName: tagName,
            tagName: tagName,
            attrs: attrs,
            namespaceURI: namespaceURI,
            childNodes: [],
            parentNode: null,
        };
    }

    public createCommentNode(data: string): CommentNode {
        return {
            nodeName: '#comment',
            data: data,
            parentNode: null,
        };
    }

    public appendChild(parentNode: ParentNode, newNode: Node): void {
        parentNode.childNodes.push(newNode);
        newNode.parentNode = parentNode;
    }

    public insertBefore(parentNode: ParentNode, newNode: Node, referenceNode: Node): void {
        const insertionIdx = parentNode.childNodes.indexOf(referenceNode);

        parentNode.childNodes.splice(insertionIdx, 0, newNode);
        newNode.parentNode = parentNode;
    }

    public setTemplateContent(templateElement: TemplateElement, contentElement: DocumentFragment): void {
        templateElement.content = contentElement;
    }

    public getTemplateContent(templateElement: TemplateElement): DocumentFragment {
        return templateElement.content;
    }

    public setDocumentType(document: Document, name: string, publicId: string, systemId: string): void {
        let doctypeNode: DocumentType | null = null;

        for (const childNode of document.childNodes) {
            if (!this.isElementNode(childNode) && childNode.nodeName === '#documentType') {
                doctypeNode = childNode;
                break;
            }
        }

        if (doctypeNode) {
            doctypeNode.name = name;
            doctypeNode.publicId = publicId;
            doctypeNode.systemId = systemId;
        } else {
            this.appendChild(document, {
                nodeName: '#documentType',
                name: name,
                publicId: publicId,
                systemId: systemId,
                parentNode: null,
            });
        }
    }

    public setDocumentMode(document: Document, mode: DocumentMode): void {
        document.mode = mode;
    }

    public getDocumentMode(document: Document): DocumentMode {
        return document.mode;
    }

    public detachNode(node: Node): void {
        if (node.parentNode) {
            const idx = node.parentNode.childNodes.indexOf(node);

            node.parentNode.childNodes.splice(idx, 1);
            node.parentNode = null;
        }
    }

    public insertText(parentNode: ParentNode, text: string): void {
        if (parentNode.childNodes.length) {
            const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];

            if (prevNode?.nodeName === '#text' && !this.isElementNode(prevNode)) {
                prevNode.value += text;
                return;
            }
        }

        this.appendChild(parentNode, createTextNode(text));
    }

    public insertTextBefore(parentNode: ParentNode, text: string, referenceNode: Node): void {
        const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

        if (prevNode && prevNode.nodeName === '#text' && !this.isElementNode(prevNode)) {
            prevNode.value += text;
        } else {
            this.insertBefore(parentNode, createTextNode(text), referenceNode);
        }
    }

    public adoptAttributes(recipient: Element, attrs: Attribute[]): void {
        const recipientAttrsMap = [];

        for (const attr of recipient.attrs) {
            recipientAttrsMap.push(attr.name);
        }

        for (const attr of attrs) {
            if (!recipientAttrsMap.includes(attr.name)) {
                recipient.attrs.push(attr);
            }
        }
    }

    public getFirstChild(node: Node): Node | undefined {
        if (!isParentNode(node)) {
            return undefined;
        }
        return node.childNodes[0];
    }

    public getChildNodes(node: Node): Node[] {
        if (!isParentNode(node)) {
            return [];
        }
        return node.childNodes;
    }

    public getParentNode(node: Node): ParentNode | null {
        return node.parentNode;
    }

    public getAttrList(element: Element): Attribute[] {
        return element.attrs;
    }

    public getTagName(element: Element): string {
        return element.tagName;
    }

    public getNamespaceURI(element: Element): string {
        return element.namespaceURI;
    }

    public getTextNodeContent(textNode: TextNode): string {
        return textNode.value;
    }

    public getCommentNodeContent(commentNode: CommentNode): string {
        return commentNode.data;
    }

    public getDocumentTypeNodeName(doctypeNode: DocumentType): string {
        return doctypeNode.name;
    }

    public getDocumentTypeNodePublicId(doctypeNode: DocumentType): string {
        return doctypeNode.publicId;
    }

    public getDocumentTypeNodeSystemId(doctypeNode: DocumentType): string {
        return doctypeNode.systemId;
    }

    public isTextNode(node: Node): node is TextNode {
        return node.nodeName === '#text';
    }

    public isCommentNode(node: Node): node is CommentNode {
        return node.nodeName === '#comment';
    }

    public isDocumentTypeNode(node: Node): node is DocumentType {
        return node.nodeName === '#documentType';
    }

    public isElementNode(node: Node): node is Element {
        return !!(node as Element).tagName;
    }

    public setNodeSourceCodeLocation(node: Node, location: Location | null | undefined): void {
        node.sourceCodeLocation = location;
    }

    public getNodeSourceCodeLocation(node: Node): Location | undefined | null {
        return node.sourceCodeLocation;
    }

    public updateNodeSourceCodeLocation(node: Element, endLocation: EndLocation & { endTag?: Location }): void;
    public updateNodeSourceCodeLocation(node: Node, endLocation: EndLocation): void {
        if (node.sourceCodeLocation) {
            node.sourceCodeLocation = { ...node.sourceCodeLocation, ...endLocation };
        }
    }
}

export const defaultTreeAdapter = new DefaultTreeAdapter();

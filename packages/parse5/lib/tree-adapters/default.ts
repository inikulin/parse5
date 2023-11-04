import { DOCUMENT_MODE, type NS } from '../common/html.js';
import type { Attribute, Location, ElementLocation } from '../common/token.js';
import type { TreeAdapter, TreeAdapterTypeMap } from './interface.js';

export interface Document {
    /** The name of the node. */
    nodeName: '#document';
    /**
     * Document mode.
     *
     * @see {@link DOCUMENT_MODE} */
    mode: DOCUMENT_MODE;
    /** The node's children. */
    childNodes: ChildNode[];
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface DocumentFragment {
    /** The name of the node. */
    nodeName: '#document-fragment';
    /** The node's children. */
    childNodes: ChildNode[];
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface Element {
    /** Element tag name. Same as {@link tagName}. */
    nodeName: string;
    /** Element tag name. Same as {@link nodeName}. */
    tagName: string;
    /** List of element attributes. */
    attrs: Attribute[];
    /** Element namespace. */
    namespaceURI: NS;
    /** Element source code location info, with attributes. Available if location info is enabled. */
    sourceCodeLocation?: ElementLocation | null;
    /** Parent node. */
    parentNode: ParentNode | null;
    /** The node's children. */
    childNodes: ChildNode[];
}

export interface CommentNode {
    /** The name of the node. */
    nodeName: '#comment';
    /** Parent node. */
    parentNode: ParentNode | null;
    /** Comment text. */
    data: string;
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface TextNode {
    nodeName: '#text';
    /** Parent node. */
    parentNode: ParentNode | null;
    /** Text content. */
    value: string;
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export interface Template extends Element {
    nodeName: 'template';
    tagName: 'template';
    /** The content of a `template` tag. */
    content: DocumentFragment;
}

export interface DocumentType {
    /** The name of the node. */
    nodeName: '#documentType';
    /** Parent node. */
    parentNode: ParentNode | null;
    /** Document type name. */
    name: string;
    /** Document type public identifier. */
    publicId: string;
    /** Document type system identifier. */
    systemId: string;
    /** Comment source code location info. Available if location info is enabled. */
    sourceCodeLocation?: Location | null;
}

export type ParentNode = Document | DocumentFragment | Element | Template;
export type ChildNode = Element | Template | CommentNode | TextNode | DocumentType;
export type Node = ParentNode | ChildNode;

export type DefaultTreeAdapterMap = TreeAdapterTypeMap<
    Node,
    ParentNode,
    ChildNode,
    Document,
    DocumentFragment,
    Element,
    CommentNode,
    TextNode,
    Template,
    DocumentType
>;

export const defaultTreeAdapter: TreeAdapter<DefaultTreeAdapterMap> = {
    //Node construction
    createDocument(): Document {
        return {
            nodeName: '#document',
            mode: DOCUMENT_MODE.NO_QUIRKS,
            childNodes: [],
        };
    },

    createDocumentFragment(): DocumentFragment {
        return {
            nodeName: '#document-fragment',
            childNodes: [],
        };
    },

    createElement(tagName: string, namespaceURI: NS, attrs: Attribute[]): Element {
        return {
            nodeName: tagName,
            tagName,
            attrs,
            namespaceURI,
            childNodes: [],
            parentNode: null,
        };
    },

    createCommentNode(data: string): CommentNode {
        return {
            nodeName: '#comment',
            data,
            parentNode: null,
        };
    },

    createTextNode(value: string): TextNode {
        return {
            nodeName: '#text',
            value,
            parentNode: null,
        };
    },

    //Tree mutation
    appendChild(parentNode: ParentNode, newNode: ChildNode): void {
        parentNode.childNodes.push(newNode);
        newNode.parentNode = parentNode;
    },

    insertBefore(parentNode: ParentNode, newNode: ChildNode, referenceNode: ChildNode): void {
        const insertionIdx = parentNode.childNodes.indexOf(referenceNode);

        parentNode.childNodes.splice(insertionIdx, 0, newNode);
        newNode.parentNode = parentNode;
    },

    setTemplateContent(templateElement: Template, contentElement: DocumentFragment): void {
        templateElement.content = contentElement;
    },

    getTemplateContent(templateElement: Template): DocumentFragment {
        return templateElement.content;
    },

    setDocumentType(document: Document, name: string, publicId: string, systemId: string): void {
        const doctypeNode = document.childNodes.find((node): node is DocumentType => node.nodeName === '#documentType');

        if (doctypeNode) {
            doctypeNode.name = name;
            doctypeNode.publicId = publicId;
            doctypeNode.systemId = systemId;
        } else {
            const node: DocumentType = {
                nodeName: '#documentType',
                name,
                publicId,
                systemId,
                parentNode: null,
            };
            defaultTreeAdapter.appendChild(document, node);
        }
    },

    setDocumentMode(document: Document, mode: DOCUMENT_MODE): void {
        document.mode = mode;
    },

    getDocumentMode(document: Document): DOCUMENT_MODE {
        return document.mode;
    },

    detachNode(node: ChildNode): void {
        if (node.parentNode) {
            const idx = node.parentNode.childNodes.indexOf(node);

            node.parentNode.childNodes.splice(idx, 1);
            node.parentNode = null;
        }
    },

    insertText(parentNode: ParentNode, text: string): void {
        if (parentNode.childNodes.length > 0) {
            const prevNode = parentNode.childNodes[parentNode.childNodes.length - 1];

            if (defaultTreeAdapter.isTextNode(prevNode)) {
                prevNode.value += text;
                return;
            }
        }

        defaultTreeAdapter.appendChild(parentNode, defaultTreeAdapter.createTextNode(text));
    },

    insertTextBefore(parentNode: ParentNode, text: string, referenceNode: ChildNode): void {
        const prevNode = parentNode.childNodes[parentNode.childNodes.indexOf(referenceNode) - 1];

        if (prevNode && defaultTreeAdapter.isTextNode(prevNode)) {
            prevNode.value += text;
        } else {
            defaultTreeAdapter.insertBefore(parentNode, defaultTreeAdapter.createTextNode(text), referenceNode);
        }
    },

    adoptAttributes(recipient: Element, attrs: Attribute[]): void {
        const recipientAttrsMap = new Set(recipient.attrs.map((attr) => attr.name));

        for (let j = 0; j < attrs.length; j++) {
            if (!recipientAttrsMap.has(attrs[j].name)) {
                recipient.attrs.push(attrs[j]);
            }
        }
    },

    //Tree traversing
    getFirstChild(node: ParentNode): null | ChildNode {
        return node.childNodes[0];
    },

    getChildNodes(node: ParentNode): ChildNode[] {
        return node.childNodes;
    },

    getParentNode(node: ChildNode): null | ParentNode {
        return node.parentNode;
    },

    getAttrList(element: Element): Attribute[] {
        return element.attrs;
    },

    //Node data
    getTagName(element: Element): string {
        return element.tagName;
    },

    getNamespaceURI(element: Element): NS {
        return element.namespaceURI;
    },

    getTextNodeContent(textNode: TextNode): string {
        return textNode.value;
    },

    getCommentNodeContent(commentNode: CommentNode): string {
        return commentNode.data;
    },

    getDocumentTypeNodeName(doctypeNode: DocumentType): string {
        return doctypeNode.name;
    },

    getDocumentTypeNodePublicId(doctypeNode: DocumentType): string {
        return doctypeNode.publicId;
    },

    getDocumentTypeNodeSystemId(doctypeNode: DocumentType): string {
        return doctypeNode.systemId;
    },

    //Node types
    isTextNode(node: Node): node is TextNode {
        return node.nodeName === '#text';
    },

    isCommentNode(node: Node): node is CommentNode {
        return node.nodeName === '#comment';
    },

    isDocumentTypeNode(node: Node): node is DocumentType {
        return node.nodeName === '#documentType';
    },

    isElementNode(node: Node): node is Element {
        return Object.prototype.hasOwnProperty.call(node, 'tagName');
    },

    // Source code location
    setNodeSourceCodeLocation(node: Node, location: ElementLocation | null): void {
        node.sourceCodeLocation = location;
    },

    getNodeSourceCodeLocation(node: Node): ElementLocation | undefined | null {
        return node.sourceCodeLocation;
    },

    updateNodeSourceCodeLocation(node: Node, endLocation: ElementLocation): void {
        node.sourceCodeLocation = { ...node.sourceCodeLocation, ...endLocation };
    },
};

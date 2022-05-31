import { TAG_NAMES as $, NS, hasUnescapedText } from '../common/html.js';
import { escapeText, escapeAttribute } from 'entities/lib/escape.js';
import type { TreeAdapter, TreeAdapterTypeMap } from '../tree-adapters/interface.js';
import { defaultTreeAdapter, type DefaultTreeAdapterMap } from '../tree-adapters/default.js';

// Sets
const VOID_ELEMENTS = new Set<string>([
    $.AREA,
    $.BASE,
    $.BASEFONT,
    $.BGSOUND,
    $.BR,
    $.COL,
    $.EMBED,
    $.FRAME,
    $.HR,
    $.IMG,
    $.INPUT,
    $.KEYGEN,
    $.LINK,
    $.META,
    $.PARAM,
    $.SOURCE,
    $.TRACK,
    $.WBR,
]);

function isVoidElement<T extends TreeAdapterTypeMap>(node: T['node'], options: InternalOptions<T>): boolean {
    return (
        options.treeAdapter.isElementNode(node) &&
        options.treeAdapter.getNamespaceURI(node) === NS.HTML &&
        VOID_ELEMENTS.has(options.treeAdapter.getTagName(node))
    );
}

export interface SerializerOptions<T extends TreeAdapterTypeMap> {
    /**
     * Specifies input tree format.
     *
     * @default `treeAdapters.default`
     */
    treeAdapter?: TreeAdapter<T>;
    /**
     * The [scripting flag](https://html.spec.whatwg.org/multipage/parsing.html#scripting-flag). If set
     * to `true`, `noscript` element content will not be escaped.
     *
     *  @default `true`
     */
    scriptingEnabled?: boolean;
}

type InternalOptions<T extends TreeAdapterTypeMap> = Required<SerializerOptions<T>>;

const defaultOpts: InternalOptions<DefaultTreeAdapterMap> = { treeAdapter: defaultTreeAdapter, scriptingEnabled: true };

/**
 * Serializes an AST node to an HTML string.
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 *
 * // Serializes a document.
 * const html = parse5.serialize(document);
 *
 * // Serializes the <html> element content.
 * const str = parse5.serialize(document.childNodes[1]);
 *
 * console.log(str); //> '<head></head><body>Hi there!</body>'
 * ```
 *
 * @param node Node to serialize.
 * @param options Serialization options.
 */
export function serialize<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    node: T['parentNode'],
    options?: SerializerOptions<T>
): string {
    const opts = { ...defaultOpts, ...options } as InternalOptions<T>;

    if (isVoidElement(node, opts)) {
        return '';
    }

    return serializeChildNodes(node, opts);
}

/**
 * Serializes an AST element node to an HTML string, including the element node.
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parseFragment('<div>Hello, <b>world</b>!</div>');
 *
 * // Serializes the <div> element.
 * const html = parse5.serializeOuter(document.childNodes[0]);
 *
 * console.log(str); //> '<div>Hello, <b>world</b>!</div>'
 * ```
 *
 * @param node Node to serialize.
 * @param options Serialization options.
 */
export function serializeOuter<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    node: T['node'],
    options?: SerializerOptions<T>
): string {
    const opts = { ...defaultOpts, ...options } as InternalOptions<T>;
    return serializeNode(node, opts);
}

function serializeChildNodes<T extends TreeAdapterTypeMap>(
    parentNode: T['parentNode'],
    options: InternalOptions<T>
): string {
    let html = '';
    // Get container of the child nodes
    const container =
        options.treeAdapter.isElementNode(parentNode) &&
        options.treeAdapter.getTagName(parentNode) === $.TEMPLATE &&
        options.treeAdapter.getNamespaceURI(parentNode) === NS.HTML
            ? options.treeAdapter.getTemplateContent(parentNode)
            : parentNode;
    const childNodes = options.treeAdapter.getChildNodes(container);

    if (childNodes) {
        for (const currentNode of childNodes) {
            html += serializeNode(currentNode, options);
        }
    }

    return html;
}

function serializeNode<T extends TreeAdapterTypeMap>(node: T['node'], options: InternalOptions<T>): string {
    if (options.treeAdapter.isElementNode(node)) {
        return serializeElement(node, options);
    }
    if (options.treeAdapter.isTextNode(node)) {
        return serializeTextNode(node, options);
    }
    if (options.treeAdapter.isCommentNode(node)) {
        return serializeCommentNode(node, options);
    }
    if (options.treeAdapter.isDocumentTypeNode(node)) {
        return serializeDocumentTypeNode(node, options);
    }
    // Return an empty string for unknown nodes
    return '';
}

function serializeElement<T extends TreeAdapterTypeMap>(node: T['element'], options: InternalOptions<T>): string {
    const tn = options.treeAdapter.getTagName(node);

    return `<${tn}${serializeAttributes(node, options)}>${
        isVoidElement(node, options) ? '' : `${serializeChildNodes(node, options)}</${tn}>`
    }`;
}

function serializeAttributes<T extends TreeAdapterTypeMap>(
    node: T['element'],
    { treeAdapter }: InternalOptions<T>
): string {
    let html = '';
    for (const attr of treeAdapter.getAttrList(node)) {
        html += ' ';

        if (!attr.namespace) {
            html += attr.name;
        } else
            switch (attr.namespace) {
                case NS.XML: {
                    html += `xml:${attr.name}`;
                    break;
                }
                case NS.XMLNS: {
                    if (attr.name !== 'xmlns') {
                        html += 'xmlns:';
                    }

                    html += attr.name;
                    break;
                }
                case NS.XLINK: {
                    html += `xlink:${attr.name}`;
                    break;
                }
                default: {
                    html += `${attr.prefix}:${attr.name}`;
                }
            }

        html += `="${escapeAttribute(attr.value)}"`;
    }

    return html;
}

function serializeTextNode<T extends TreeAdapterTypeMap>(node: T['textNode'], options: InternalOptions<T>): string {
    const { treeAdapter } = options;
    const content = treeAdapter.getTextNodeContent(node);
    const parent = treeAdapter.getParentNode(node);
    const parentTn = parent && treeAdapter.isElementNode(parent) && treeAdapter.getTagName(parent);

    return parentTn &&
        treeAdapter.getNamespaceURI(parent) === NS.HTML &&
        hasUnescapedText(parentTn, options.scriptingEnabled)
        ? content
        : escapeText(content);
}

function serializeCommentNode<T extends TreeAdapterTypeMap>(
    node: T['commentNode'],
    { treeAdapter }: InternalOptions<T>
): string {
    return `<!--${treeAdapter.getCommentNodeContent(node)}-->`;
}

function serializeDocumentTypeNode<T extends TreeAdapterTypeMap>(
    node: T['documentType'],
    { treeAdapter }: InternalOptions<T>
): string {
    return `<!DOCTYPE ${treeAdapter.getDocumentTypeNodeName(node)}>`;
}

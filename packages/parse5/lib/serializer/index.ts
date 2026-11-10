import { TAG_NAMES as $, NS, hasUnescapedText } from '../common/html.js';
import { escapeText, escapeAttribute } from 'entities/escape';
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
 * import * as parse5 from 'parse5';
 *
 * const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 *
 * // Serializes a document.
 * const html = parse5.serialize(document);
 *
 * // Serializes the <html> element content.
 * const htmlElement = document.childNodes.find(parse5.defaultTreeAdapter.isElementNode);
 * if (htmlElement) {
 *     const str = parse5.serialize(htmlElement);
 *     console.log(str); //> '<head></head><body>Hi there!</body>'
 * }
 * ```
 *
 * @param node Node to serialize.
 * @param options Serialization options.
 */
export function serialize<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    node: T['parentNode'],
    options?: SerializerOptions<T>,
): string {
    const opts = { ...defaultOpts, ...options } as InternalOptions<T>;

    if (isVoidElement(node, opts)) {
        return '';
    }

    const { treeAdapter } = opts;
    // A template's children are those of its content fragment.
    const container =
        treeAdapter.isElementNode(node) &&
        treeAdapter.getTagName(node) === $.TEMPLATE &&
        treeAdapter.getNamespaceURI(node) === NS.HTML
            ? treeAdapter.getTemplateContent(node)
            : node;

    return serializeNodes(treeAdapter.getChildNodes(container) ?? [], opts);
}

/**
 * Serializes an AST element node to an HTML string, including the element node.
 *
 * @example
 *
 * ```js
 * import * as parse5 from 'parse5';
 *
 * const document = parse5.parseFragment('<div>Hello, <b>world</b>!</div>');
 *
 * // Serializes the <div> element.
 * const div = document.childNodes.find(parse5.defaultTreeAdapter.isElementNode);
 * if (div) {
 *     const str = parse5.serializeOuter(div);
 *     console.log(str); //> '<div>Hello, <b>world</b>!</div>'
 * }
 * ```
 *
 * @param node Node to serialize.
 * @param options Serialization options.
 */
export function serializeOuter<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    node: T['node'],
    options?: SerializerOptions<T>,
): string {
    const opts = { ...defaultOpts, ...options } as InternalOptions<T>;
    return serializeNodes([node], opts);
}

function serializeNodes<T extends TreeAdapterTypeMap>(nodes: T['node'][], options: InternalOptions<T>): string {
    const { treeAdapter } = options;
    // The depth of the tree is not bounded, so the open elements (their
    // remaining siblings and end tags) are kept on explicit stacks.
    const stack: { nodes: T['node'][]; index: number; endTag: string }[] = [];
    let html = '';
    let index = 0;

    for (;;) {
        if (index < nodes.length) {
            const node = nodes[index++];

            if (treeAdapter.isElementNode(node)) {
                const tn = treeAdapter.getTagName(node);

                html += `<${tn}${serializeAttributes(node, options)}>`;

                const isHtml = treeAdapter.getNamespaceURI(node) === NS.HTML;

                if (!(isHtml && VOID_ELEMENTS.has(tn))) {
                    stack.push({ nodes, index, endTag: `</${tn}>` });
                    nodes =
                        treeAdapter.getChildNodes(
                            isHtml && tn === $.TEMPLATE ? treeAdapter.getTemplateContent(node) : node,
                        ) ?? [];
                    index = 0;
                }
            } else if (treeAdapter.isTextNode(node)) {
                html += serializeTextNode(node, options);
            } else if (treeAdapter.isCommentNode(node)) {
                html += serializeCommentNode(node, options);
            } else if (treeAdapter.isDocumentTypeNode(node)) {
                html += serializeDocumentTypeNode(node, options);
            }
        } else {
            const parent = stack.pop();

            if (!parent) {
                return html;
            }

            html += parent.endTag;
            ({ nodes, index } = parent);
        }
    }
}

function serializeAttributes<T extends TreeAdapterTypeMap>(
    node: T['element'],
    { treeAdapter }: InternalOptions<T>,
): string {
    let html = '';
    for (const attr of treeAdapter.getAttrList(node)) {
        html += ' ';

        if (attr.namespace) {
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
        } else {
            html += attr.name;
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
    { treeAdapter }: InternalOptions<T>,
): string {
    return `<!--${treeAdapter.getCommentNodeContent(node)}-->`;
}

function serializeDocumentTypeNode<T extends TreeAdapterTypeMap>(
    node: T['documentType'],
    { treeAdapter }: InternalOptions<T>,
): string {
    return `<!DOCTYPE ${treeAdapter.getDocumentTypeNodeName(node)}>`;
}

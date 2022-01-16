import { TAG_NAMES as $, NAMESPACES as NS } from '../common/html.js';
import type { TreeAdapter, TreeAdapterTypeMap } from '../tree-adapters/interface';

//Escaping regexes
const AMP_REGEX = /&/g;
const NBSP_REGEX = /\u00A0/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const LT_REGEX = /</g;
const GT_REGEX = />/g;

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
const UNESCAPED_TEXT = new Set<string>([
    $.STYLE,
    $.SCRIPT,
    $.XMP,
    $.IFRAME,
    $.NOEMBED,
    $.NOFRAMES,
    $.PLAINTEXT,
    $.NOSCRIPT,
]);

export interface SerializerOptions<T extends TreeAdapterTypeMap> {
    /**
     * Specifies input tree format.
     *
     * @default `treeAdapters.default`
     */
    treeAdapter: TreeAdapter<T>;
}

//Serializer
export function serializeChildNodes<T extends TreeAdapterTypeMap>(
    parentNode: T['parentNode'],
    options: SerializerOptions<T>
): string {
    let html = '';
    const childNodes = options.treeAdapter.getChildNodes(parentNode);

    if (childNodes) {
        for (const currentNode of childNodes) {
            if (options.treeAdapter.isElementNode(currentNode)) {
                html += serializeElement(currentNode, options);
            } else if (options.treeAdapter.isTextNode(currentNode)) {
                html += serializeTextNode(currentNode, options);
            } else if (options.treeAdapter.isCommentNode(currentNode)) {
                html += serializeCommentNode(currentNode, options);
            } else if (options.treeAdapter.isDocumentTypeNode(currentNode)) {
                html += serializeDocumentTypeNode(currentNode, options);
            }
        }
    }

    return html;
}

export function serializeElement<T extends TreeAdapterTypeMap>(
    node: T['element'],
    options: SerializerOptions<T>
): string {
    const tn = options.treeAdapter.getTagName(node);

    return `<${tn}${serializeAttributes(node, options)}>${
        VOID_ELEMENTS.has(tn)
            ? ''
            : `${serializeChildNodes(
                  // Get container of the child nodes
                  tn === $.TEMPLATE && options.treeAdapter.getNamespaceURI(node) === NS.HTML
                      ? options.treeAdapter.getTemplateContent(node)
                      : node,
                  options
              )}</${tn}>`
    }`;
}

function serializeAttributes<T extends TreeAdapterTypeMap>(
    node: T['element'],
    { treeAdapter }: SerializerOptions<T>
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

        html += `="${escapeString(attr.value, true)}"`;
    }

    return html;
}

function serializeTextNode<T extends TreeAdapterTypeMap>(
    node: T['textNode'],
    { treeAdapter }: SerializerOptions<T>
): string {
    const content = treeAdapter.getTextNodeContent(node);
    const parent = treeAdapter.getParentNode(node);

    return parent && treeAdapter.isElementNode(parent) && UNESCAPED_TEXT.has(treeAdapter.getTagName(parent))
        ? content
        : escapeString(content, false);
}

function serializeCommentNode<T extends TreeAdapterTypeMap>(
    node: T['commentNode'],
    { treeAdapter }: SerializerOptions<T>
): string {
    return `<!--${treeAdapter.getCommentNodeContent(node)}-->`;
}

function serializeDocumentTypeNode<T extends TreeAdapterTypeMap>(
    node: T['documentType'],
    { treeAdapter }: SerializerOptions<T>
): string {
    return `<!DOCTYPE ${treeAdapter.getDocumentTypeNodeName(node)}>`;
}

// NOTE: used in tests and by rewriting stream
export function escapeString(str: string, attrMode = false): string {
    str = str.replace(AMP_REGEX, '&amp;').replace(NBSP_REGEX, '&nbsp;');

    return attrMode
        ? str.replace(DOUBLE_QUOTE_REGEX, '&quot;')
        : str.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;');
}

const HTML = require('../../packages/parse5/lib/common/html');

function getSerializedTreeIndent(indent) {
    let str = '|';

    for (let i = 0; i < indent + 1; i++) {
        str += ' ';
    }

    return str;
}

function getElementSerializedNamespaceURI(element, treeAdapter) {
    switch (treeAdapter.getNamespaceURI(element)) {
        case HTML.NAMESPACES.SVG:
            return 'svg ';
        case HTML.NAMESPACES.MATHML:
            return 'math ';
        default:
            return '';
    }
}

function serializeNodeList(nodes, indent, treeAdapter) {
    let str = '';

    nodes.forEach(node => {
        str += getSerializedTreeIndent(indent);

        if (treeAdapter.isCommentNode(node)) {
            str += `<!-- ${treeAdapter.getCommentNodeContent(node)} -->\n`;
        } else if (treeAdapter.isTextNode(node)) {
            str += `"${treeAdapter.getTextNodeContent(node)}"\n`;
        } else if (treeAdapter.isDocumentTypeNode(node)) {
            const publicId = treeAdapter.getDocumentTypeNodePublicId(node);
            const systemId = treeAdapter.getDocumentTypeNodeSystemId(node);

            str += `<!DOCTYPE ${treeAdapter.getDocumentTypeNodeName(node) || ''}`;

            if (publicId || systemId) {
                str += ` "${publicId}" "${systemId}"`;
            }

            str += '>\n';
        } else {
            const tn = treeAdapter.getTagName(node);

            str += `<${getElementSerializedNamespaceURI(node, treeAdapter) + tn}>\n`;

            let childrenIndent = indent + 2;
            const serializedAttrs = [];

            treeAdapter.getAttrList(node).forEach(attr => {
                let attrStr = getSerializedTreeIndent(childrenIndent);

                if (attr.prefix) {
                    attrStr += `${attr.prefix} `;
                }

                attrStr += `${attr.name}="${attr.value}"\n`;

                serializedAttrs.push(attrStr);
            });

            str += serializedAttrs.sort().join('');

            if (tn === HTML.TAG_NAMES.TEMPLATE && treeAdapter.getNamespaceURI(node) === HTML.NAMESPACES.HTML) {
                str += `${getSerializedTreeIndent(childrenIndent)}content\n`;
                childrenIndent += 2;
                node = treeAdapter.getTemplateContent(node);
            }

            str += serializeNodeList(treeAdapter.getChildNodes(node), childrenIndent, treeAdapter);
        }
    });

    return str;
}

module.exports = function serializeToDatFileFormat(rootNode, treeAdapter) {
    return serializeNodeList(treeAdapter.getChildNodes(rootNode), 0, treeAdapter);
};

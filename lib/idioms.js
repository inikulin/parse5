var html = require('./html');

//Aliases
var $ = html.TAG_NAMES,
    NAMESPACES = html.NAMESPACES;

//TODO use consts here for tagNames
exports.SPECIAL_ELEMENTS = {
    'address': NAMESPACES.HTML,
    'applet': NAMESPACES.HTML,
    'area': NAMESPACES.HTML,
    'article': NAMESPACES.HTML,
    'aside': NAMESPACES.HTML,
    'base': NAMESPACES.HTML,
    'basefont': NAMESPACES.HTML,
    'bgsound': NAMESPACES.HTML,
    'blockquote': NAMESPACES.HTML,
    'body': NAMESPACES.HTML,
    'br': NAMESPACES.HTML,
    'button': NAMESPACES.HTML,
    'caption': NAMESPACES.HTML,
    'center': NAMESPACES.HTML,
    'col': NAMESPACES.HTML,
    'colgroup': NAMESPACES.HTML,
    'dd': NAMESPACES.HTML,
    'details': NAMESPACES.HTML,
    'dir': NAMESPACES.HTML,
    'div': NAMESPACES.HTML,
    'dl': NAMESPACES.HTML,
    'dt': NAMESPACES.HTML,
    'embed': NAMESPACES.HTML,
    'fieldset': NAMESPACES.HTML,
    'figcaption': NAMESPACES.HTML,
    'figure': NAMESPACES.HTML,
    'footer': NAMESPACES.HTML,
    'form': NAMESPACES.HTML,
    'frame': NAMESPACES.HTML,
    'frameset': NAMESPACES.HTML,
    'h1': NAMESPACES.HTML,
    'h2': NAMESPACES.HTML,
    'h3': NAMESPACES.HTML,
    'h4': NAMESPACES.HTML,
    'h5': NAMESPACES.HTML,
    'h6': NAMESPACES.HTML,
    'head': NAMESPACES.HTML,
    'header': NAMESPACES.HTML,
    'hgroup': NAMESPACES.HTML,
    'hr': NAMESPACES.HTML,
    'html': NAMESPACES.HTML,
    'iframe': NAMESPACES.HTML,
    'img': NAMESPACES.HTML,
    'input': NAMESPACES.HTML,
    'isindex': NAMESPACES.HTML,
    'li': NAMESPACES.HTML,
    'link': NAMESPACES.HTML,
    'listing': NAMESPACES.HTML,
    'main': NAMESPACES.HTML,
    'marquee': NAMESPACES.HTML,
    'menu': NAMESPACES.HTML,
    'menuitem': NAMESPACES.HTML,
    'meta': NAMESPACES.HTML,
    'nav': NAMESPACES.HTML,
    'noembed': NAMESPACES.HTML,
    'noframes': NAMESPACES.HTML,
    'noscript': NAMESPACES.HTML,
    'object': NAMESPACES.HTML,
    'ol': NAMESPACES.HTML,
    'p': NAMESPACES.HTML,
    'param': NAMESPACES.HTML,
    'plaintext': NAMESPACES.HTML,
    'pre': NAMESPACES.HTML,
    'script': NAMESPACES.HTML,
    'section': NAMESPACES.HTML,
    'select': NAMESPACES.HTML,
    'source': NAMESPACES.HTML,
    'style': NAMESPACES.HTML,
    'summary': NAMESPACES.HTML,
    'table': NAMESPACES.HTML,
    'tbody': NAMESPACES.HTML,
    'td': NAMESPACES.HTML,
    'textarea': NAMESPACES.HTML,
    'tfoot': NAMESPACES.HTML,
    'th': NAMESPACES.HTML,
    'thead': NAMESPACES.HTML,
    'title': [NAMESPACES.HTML, NAMESPACES.SVG],
    'tr': NAMESPACES.HTML,
    'track': NAMESPACES.HTML,
    'ul': NAMESPACES.HTML,
    'wbr': NAMESPACES.HTML,
    'xmp': NAMESPACES.HTML,
    'mi': NAMESPACES.MATHML,
    'mo': NAMESPACES.MATHML,
    'mn': NAMESPACES.MATHML,
    'ms': NAMESPACES.MATHML,
    'mtext': NAMESPACES.MATHML,
    'annotation-xml': NAMESPACES.MATHML,
    'foreignObject': NAMESPACES.SVG,
    'desc': NAMESPACES.SVG
};

exports.SCOPING_ELEMENTS = {
    'applet': NAMESPACES.HTML,
    'caption': NAMESPACES.HTML,
    'html': NAMESPACES.HTML,
    'table': NAMESPACES.HTML,
    'td': NAMESPACES.HTML,
    'th': NAMESPACES.HTML,
    'marquee': NAMESPACES.HTML,
    'object': NAMESPACES.HTML,
    'mi': NAMESPACES.MATHML,
    'mo': NAMESPACES.MATHML,
    'mn': NAMESPACES.MATHML,
    'ms': NAMESPACES.MATHML,
    'mtext': NAMESPACES.MATHML,
    'annotation-xml': NAMESPACES.MATHML,
    'foreignObject': NAMESPACES.SVG,
    'desc': NAMESPACES.SVG,
    'title': NAMESPACES.SVG
};

exports.isImpliedEndTagRequired = function (tagName) {
    return tagName === $.DD || tagName === $.DT || tagName === $.LI || tagName === $.OPTION ||
           tagName === $.OPTGROUP || tagName === $.P || tagName === $.RP || tagName === $.RT;
};

exports.shouldTagBeClosedInBody = function (tagName) {
    return tagName !== $.DD || tagName !== $.DT || tagName !== $.LI || tagName !== $.OPTGROUP ||
           tagName !== $.OPTION || tagName !== $.P || tagName !== $.RP || tagName !== $.RT ||
           tagName !== $.TBODY || tagName !== $.TD || tagName !== $.TFOOT || tagName !== $.TH ||
           tagName !== $.THEAD || tagName !== $.TR || tagName !== $.BODY || tagName !== $.HTML;
};

exports.isInMathMLTextIntegrationPoint = function (tagName, namespaceURI) {
    return namespaceURI === NAMESPACES.MATHML &&
           (tagName === $.MI || tagName === $.MO || tagName === $.MN || tagName === $.MS || tagName === $.MTEXT);
};

exports.isInHtmlIntegrationPoint = function (tagName, namespaceURI) {
    //TODO
};
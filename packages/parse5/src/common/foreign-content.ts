import { Tokenizer, StartTagToken, EndTagToken, AttributeToken } from '../tokenizer/index.js';
import * as HTML from './html.js';

//Aliases
const $ = HTML.TAG_NAMES;
const NS = HTML.NAMESPACES;
const ATTRS = HTML.ATTRS;

//MIME types
const MIME_TYPES = {
    TEXT_HTML: 'text/html',
    APPLICATION_XML: 'application/xhtml+xml',
};

//Attributes
const DEFINITION_URL_ATTR = 'definitionurl';
const ADJUSTED_DEFINITION_URL_ATTR = 'definitionURL';
const SVG_ATTRS_ADJUSTMENT_MAP: Record<string, string> = {
    attributename: 'attributeName',
    attributetype: 'attributeType',
    basefrequency: 'baseFrequency',
    baseprofile: 'baseProfile',
    calcmode: 'calcMode',
    clippathunits: 'clipPathUnits',
    diffuseconstant: 'diffuseConstant',
    edgemode: 'edgeMode',
    filterunits: 'filterUnits',
    glyphref: 'glyphRef',
    gradienttransform: 'gradientTransform',
    gradientunits: 'gradientUnits',
    kernelmatrix: 'kernelMatrix',
    kernelunitlength: 'kernelUnitLength',
    keypoints: 'keyPoints',
    keysplines: 'keySplines',
    keytimes: 'keyTimes',
    lengthadjust: 'lengthAdjust',
    limitingconeangle: 'limitingConeAngle',
    markerheight: 'markerHeight',
    markerunits: 'markerUnits',
    markerwidth: 'markerWidth',
    maskcontentunits: 'maskContentUnits',
    maskunits: 'maskUnits',
    numoctaves: 'numOctaves',
    pathlength: 'pathLength',
    patterncontentunits: 'patternContentUnits',
    patterntransform: 'patternTransform',
    patternunits: 'patternUnits',
    pointsatx: 'pointsAtX',
    pointsaty: 'pointsAtY',
    pointsatz: 'pointsAtZ',
    preservealpha: 'preserveAlpha',
    preserveaspectratio: 'preserveAspectRatio',
    primitiveunits: 'primitiveUnits',
    refx: 'refX',
    refy: 'refY',
    repeatcount: 'repeatCount',
    repeatdur: 'repeatDur',
    requiredextensions: 'requiredExtensions',
    requiredfeatures: 'requiredFeatures',
    specularconstant: 'specularConstant',
    specularexponent: 'specularExponent',
    spreadmethod: 'spreadMethod',
    startoffset: 'startOffset',
    stddeviation: 'stdDeviation',
    stitchtiles: 'stitchTiles',
    surfacescale: 'surfaceScale',
    systemlanguage: 'systemLanguage',
    tablevalues: 'tableValues',
    targetx: 'targetX',
    targety: 'targetY',
    textlength: 'textLength',
    viewbox: 'viewBox',
    viewtarget: 'viewTarget',
    xchannelselector: 'xChannelSelector',
    ychannelselector: 'yChannelSelector',
    zoomandpan: 'zoomAndPan',
};

interface XMLAdjustment {
    prefix: string;
    name: string;
    namespace: string;
}

const XML_ATTRS_ADJUSTMENT_MAP: Record<string, XMLAdjustment> = {
    'xlink:actuate': { prefix: 'xlink', name: 'actuate', namespace: NS.XLINK },
    'xlink:arcrole': { prefix: 'xlink', name: 'arcrole', namespace: NS.XLINK },
    'xlink:href': { prefix: 'xlink', name: 'href', namespace: NS.XLINK },
    'xlink:role': { prefix: 'xlink', name: 'role', namespace: NS.XLINK },
    'xlink:show': { prefix: 'xlink', name: 'show', namespace: NS.XLINK },
    'xlink:title': { prefix: 'xlink', name: 'title', namespace: NS.XLINK },
    'xlink:type': { prefix: 'xlink', name: 'type', namespace: NS.XLINK },
    'xml:base': { prefix: 'xml', name: 'base', namespace: NS.XML },
    'xml:lang': { prefix: 'xml', name: 'lang', namespace: NS.XML },
    'xml:space': { prefix: 'xml', name: 'space', namespace: NS.XML },
    xmlns: { prefix: '', name: 'xmlns', namespace: NS.XMLNS },
    'xmlns:xlink': { prefix: 'xmlns', name: 'xlink', namespace: NS.XMLNS },
};

//SVG tag names adjustment map
export const SVG_TAG_NAMES_ADJUSTMENT_MAP: Record<string, string> = {
    altglyph: 'altGlyph',
    altglyphdef: 'altGlyphDef',
    altglyphitem: 'altGlyphItem',
    animatecolor: 'animateColor',
    animatemotion: 'animateMotion',
    animatetransform: 'animateTransform',
    clippath: 'clipPath',
    feblend: 'feBlend',
    fecolormatrix: 'feColorMatrix',
    fecomponenttransfer: 'feComponentTransfer',
    fecomposite: 'feComposite',
    feconvolvematrix: 'feConvolveMatrix',
    fediffuselighting: 'feDiffuseLighting',
    fedisplacementmap: 'feDisplacementMap',
    fedistantlight: 'feDistantLight',
    feflood: 'feFlood',
    fefunca: 'feFuncA',
    fefuncb: 'feFuncB',
    fefuncg: 'feFuncG',
    fefuncr: 'feFuncR',
    fegaussianblur: 'feGaussianBlur',
    feimage: 'feImage',
    femerge: 'feMerge',
    femergenode: 'feMergeNode',
    femorphology: 'feMorphology',
    feoffset: 'feOffset',
    fepointlight: 'fePointLight',
    fespecularlighting: 'feSpecularLighting',
    fespotlight: 'feSpotLight',
    fetile: 'feTile',
    feturbulence: 'feTurbulence',
    foreignobject: 'foreignObject',
    glyphref: 'glyphRef',
    lineargradient: 'linearGradient',
    radialgradient: 'radialGradient',
    textpath: 'textPath',
};

//Tags that causes exit from foreign content
const EXITS_FOREIGN_CONTENT: Record<string, boolean> = {
    [$.B]: true,
    [$.BIG]: true,
    [$.BLOCKQUOTE]: true,
    [$.BODY]: true,
    [$.BR]: true,
    [$.CENTER]: true,
    [$.CODE]: true,
    [$.DD]: true,
    [$.DIV]: true,
    [$.DL]: true,
    [$.DT]: true,
    [$.EM]: true,
    [$.EMBED]: true,
    [$.H1]: true,
    [$.H2]: true,
    [$.H3]: true,
    [$.H4]: true,
    [$.H5]: true,
    [$.H6]: true,
    [$.HEAD]: true,
    [$.HR]: true,
    [$.I]: true,
    [$.IMG]: true,
    [$.LI]: true,
    [$.LISTING]: true,
    [$.MENU]: true,
    [$.META]: true,
    [$.NOBR]: true,
    [$.OL]: true,
    [$.P]: true,
    [$.PRE]: true,
    [$.RUBY]: true,
    [$.S]: true,
    [$.SMALL]: true,
    [$.SPAN]: true,
    [$.STRONG]: true,
    [$.STRIKE]: true,
    [$.SUB]: true,
    [$.SUP]: true,
    [$.TABLE]: true,
    [$.TT]: true,
    [$.U]: true,
    [$.UL]: true,
    [$.VAR]: true,
};

//Check exit from foreign content
export function causesExit(startTagToken: StartTagToken): boolean {
    const tn = startTagToken.tagName;
    const isFontWithAttrs =
        tn === $.FONT &&
        (Tokenizer.getTokenAttr(startTagToken, ATTRS.COLOR) !== null ||
            Tokenizer.getTokenAttr(startTagToken, ATTRS.SIZE) !== null ||
            Tokenizer.getTokenAttr(startTagToken, ATTRS.FACE) !== null);

    return isFontWithAttrs ? true : EXITS_FOREIGN_CONTENT[tn] ?? false;
}

//Token adjustments
export function adjustTokenMathMLAttrs(token: StartTagToken): void {
    for (const attr of token.attrs) {
        if (attr.name === DEFINITION_URL_ATTR) {
            attr.name = ADJUSTED_DEFINITION_URL_ATTR;
            break;
        }
    }
}

export function adjustTokenSVGAttrs(token: StartTagToken): void {
    for (const attr of token.attrs) {
        const adjustedAttrName = SVG_ATTRS_ADJUSTMENT_MAP[attr.name];

        if (adjustedAttrName) {
            attr.name = adjustedAttrName;
        }
    }
}

export function adjustTokenXMLAttrs(token: StartTagToken): void {
    for (const attr of token.attrs) {
        const adjustedAttrEntry = XML_ATTRS_ADJUSTMENT_MAP[attr.name];

        if (adjustedAttrEntry) {
            attr.prefix = adjustedAttrEntry.prefix;
            attr.name = adjustedAttrEntry.name;
            attr.namespace = adjustedAttrEntry.namespace;
        }
    }
}

export function adjustTokenSVGTagName(token: StartTagToken | EndTagToken): void {
    const adjustedTagName = SVG_TAG_NAMES_ADJUSTMENT_MAP[token.tagName];

    if (adjustedTagName) {
        token.tagName = adjustedTagName;
    }
}

//Integration points
function isMathMLTextIntegrationPoint(tn: string, ns: string): boolean {
    return ns === NS.MATHML && (tn === $.MI || tn === $.MO || tn === $.MN || tn === $.MS || tn === $.MTEXT);
}

function isHtmlIntegrationPoint(tn: string, ns: string, attrs: AttributeToken[]): boolean {
    if (ns === NS.MATHML && tn === $.ANNOTATION_XML) {
        for (const attr of attrs) {
            if (attr.name === ATTRS.ENCODING) {
                const value = attr.value.toLowerCase();

                return value === MIME_TYPES.TEXT_HTML || value === MIME_TYPES.APPLICATION_XML;
            }
        }
    }

    return ns === NS.SVG && (tn === $.FOREIGN_OBJECT || tn === $.DESC || tn === $.TITLE);
}

export function isIntegrationPoint(tn: string, ns: string, attrs: AttributeToken[], foreignNS?: string) {
    if ((!foreignNS || foreignNS === NS.HTML) && isHtmlIntegrationPoint(tn, ns, attrs)) {
        return true;
    }

    if ((!foreignNS || foreignNS === NS.MATHML) && isMathMLTextIntegrationPoint(tn, ns)) {
        return true;
    }

    return false;
}

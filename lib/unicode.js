exports.REPLACEMENT_CHARACTER = '\uFFFD';

exports.CODE_POINTS = {
    UNDEFINED: -2,
    EOF: -1,
    NULL: 0x00,
    TABULATION: 0x09,
    CARRIAGE_RETURN: 0x0D,
    LINE_FEED: 0x0A,
    FORM_FEED: 0x0C,
    SPACE: 0x20,
    EXCLAMATION_MARK: 0x21,
    QUOTATION_MARK: 0x22,
    NUMBER_SIGN: 0x23,
    AMPERSAND: 0x26,
    APOSTROPHE: 0x27,
    HYPHEN_MINUS: 0x2D,
    SOLIDUS: 0x2F,
    DIGIT_0: 0x30,
    DIGIT_9: 0x39,
    SEMICOLON: 0x3B,
    LESS_THAN_SIGN: 0x3C,
    EQUALS_SIGN: 0x3D,
    GREATER_THAN_SIGN: 0x3E,
    QUESTION_MARK: 0x3F,
    LATIN_CAPITAL_A: 0x41,
    LATIN_CAPITAL_X: 0x58,
    LATIN_CAPITAL_Z: 0x5A,
    GRAVE_ACCENT: 0x60,
    LATIN_SMALL_A: 0x61,
    LATIN_SMALL_X: 0x78,
    LATIN_SMALL_Z: 0x7A,
    BOM: 0xFEFF,
    REPLACEMENT_CHARACTER: 0xFFFD
};

exports.CODE_POINT_SEQUENCES = {
    DASH_DASH_STRING: [0x2D, 0x2D], //--
    DOCTYPE_STRING: [0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45], //DOCTYPE
    CDATA_START_STRING: [0x5B, 0x43, 0x44, 0x41, 0x54, 0x41, 0x5B], //[CDATA[
    CDATA_END_STRING: [0x5D, 0x5D, 0x3E], //]]>
    PUBLIC_STRING: [0x50, 0x55, 0x42, 0x4C, 0x49, 0x43], //PUBLIC
    SYSTEM_STRING: [0x53, 0x59, 0x53, 0x54, 0x45, 0x4D] //SYSTEM
};

exports.NUMERIC_ENTITY_REPLACEMENTS = {
    0x00: '\uFFFD', 0x0D: '\u000D', 0x80: '\u20AC', 0x81: '\u0081', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E',
    0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021', 0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039',
    0x8C: '\u0152', 0x8D: '\u008D', 0x8E: '\u017D', 0x8F: '\u008F', 0x90: '\u0090', 0x91: '\u2018', 0x92: '\u2019',
    0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014', 0x98: '\u02DC', 0x99: '\u2122',
    0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153', 0x9D: '\u009D', 0x9E: '\u017E', 0x9F: '\u0178'
};

exports.isIllegalCodePoint = function (cp) {
    //OPTIMIZATION: in most common cases HTML input characters are in BMP range. Reduce comparisons by checking only
    //this range.
    if (cp < 0x1FFFE) {
        return cp >= 0x01 && cp <= 0x08 || cp >= 0x0E && cp <= 0x1F || cp >= 0x7F && cp <= 0x9F ||
               cp === 0x0B || cp >= 0xFDD0 && cp <= 0xFDEF || cp === 0xFFFE || cp === 0xFFFF;
    }

    //OPTIMIZATION: we have a worst case. Here we use straight comparison instead of hash-table which
    //gives about 5% performance boost
    return cp === 0x1FFFE || cp === 0x1FFFF || cp === 0x2FFFE || cp === 0x2FFFF || cp === 0x3FFFE || cp === 0x3FFFF ||
           cp === 0x4FFFE || cp === 0x4FFFF || cp === 0x5FFFE || cp === 0x5FFFF || cp === 0x6FFFE || cp === 0x6FFFF ||
           cp === 0x7FFFE || cp === 0x7FFFF || cp === 0x8FFFE || cp === 0x8FFFF || cp === 0x9FFFE || cp === 0x9FFFF ||
           cp === 0xAFFFE || cp === 0xAFFFF || cp === 0xBFFFE || cp === 0xBFFFF || cp === 0xCFFFE || cp === 0xCFFFF ||
           cp === 0xDFFFE || cp === 0xDFFFF || cp === 0xEFFFE || cp === 0xEFFFF || cp === 0xFFFFE || cp === 0xFFFFF ||
           cp === 0x10FFFE || cp === 0x10FFFF;
};

exports.isReservedCodePoint = function (cp) {
    return cp >= 0xD800 && cp <= 0xDFFF || cp > 0x10FFFF;
};

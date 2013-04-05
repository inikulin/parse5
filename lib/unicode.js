//Const
exports.CHARS = {
    EOF: null,
    BOM: '\uFEFF',
    NULL: '\u0000',
    GRAVE_ACCENT: '\u0060',
    REPLACEMENT_CHARACTER: '\uFFFD'
};

exports.CHAR_CODES = {
    EOF: -1,
    BOM: 0xFEFF,
    NULL: 0x0000,
    CARRIAGE_RETURN: 0x000D,
    LINE_FEED: 0x000A,
    FORM_FEED: 0x000C,
    TABULATION: 0x0009,
    SPACE: 0x0020,
    AMPERSAND: 0x0026,
    LESS_THAN_SIGN: 0x003C,
    GREATER_THAN_SIGN: 0x003E,
    NUMBER_SIGN: 0x0023,
    REPLACEMENT_CHARACTER: 0xFFFD,
    EXCLAMATION_MARK: 0x0021,
    QUESTION_MARK: 0x003F,
    QUOTATION_MARK: 0x0022,
    APOSTROPHE: 0x0027,
    EQUALS_SIGN: 0x003D,
    GRAVE_ACCENT: 0x0060,
    SOLIDUS: 0x002F,
    SEMICOLON: 0x003B,
    HYPHEN_MINUS: 0x002D,
    LATIN_CAPITAL_A: 0x0041,
    LATIN_CAPITAL_Z: 0x005A,
    LATIN_SMALL_A: 0x0061,
    LATIN_SMALL_Z: 0x007A,
    LATIN_CAPITAL_X: 0x0078,
    LATIN_SMALL_X: 0x0058,
    DIGIT_0: 0x0030,
    DIGIT_9: 0x0039
};

exports.CHAR_CODE_SEQUENCES = {
    DASH_DASH_STRING: [0x002D, 0x002D], //--
    DOCTYPE_STRING: [0x0044, 0x004F, 0x0043, 0x0054, 0x0059, 0x0050, 0x0045], //DOCTYPE
    CDATA_START_STRING: [0x005B, 0x0043, 0x0044, 0x0041, 0x0054, 0x0041, 0x005B], //[CDATA[
    CDATA_END_STRING: [0x005D, 0x005D, 0x003E], //]]>
    PUBLIC_STRING: [0x0050, 0x0055, 0x0042, 0x004C, 0x0049, 0x0043], //PUBLIC
    SYSTEM_STRING: [0x0053, 0x0059, 0x0053, 0x0054, 0x0045, 0x004D] //SYSTEM
};

//Illegal char codes
exports.isIllegalCharCode = function (cc) {
    //OPTIMIZATION: in most common cases HTML input characters are in BMP range. Reduce comparisons by checking only
    //this range.
    if (cc < 0x1FFFE) {
        return cc >= 0x0001 && cc <= 0x0008 ||
            cc >= 0x000E && cc <= 0x001F ||
            cc >= 0x007F && cc <= 0x009F ||
            cc >= 0xFDD0 && cc <= 0xFDEF ||
            cc === 0x000B || cc === 0xFFFE || cc === 0xFFFF;
    }

    //OPTIMIZATION: we have a worst case. Here we use straight comparison instead of hash-table which
    //gives about 5% performance boost
    return cc === 0x1FFFE || cc === 0x1FFFF || cc === 0x2FFFE || cc === 0x2FFFF ||
        cc === 0x3FFFE || cc === 0x3FFFF || cc === 0x4FFFE || cc === 0x4FFFF ||
        cc === 0x5FFFE || cc === 0x5FFFF || cc === 0x6FFFE || cc === 0x6FFFF ||
        cc === 0x7FFFE || cc === 0x7FFFF || cc === 0x8FFFE || cc === 0x8FFFF ||
        cc === 0x9FFFE || cc === 0x9FFFF || cc === 0xAFFFE || cc === 0xAFFFF ||
        cc === 0xBFFFE || cc === 0xBFFFF || cc === 0xCFFFE || cc === 0xCFFFF ||
        cc === 0xDFFFE || cc === 0xDFFFF || cc === 0xEFFFE || cc === 0xEFFFF ||
        cc === 0xFFFFE || cc === 0xFFFFF || cc === 0x10FFFE || cc === 0x10FFFF;
};

exports.isReservedCharCode = function (cc) {
    return cc >= 0xD800 && cc <= 0xDFFF || cc > 0x10FFFF;
};

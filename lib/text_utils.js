//Const
var ILLEGAL_CHAR_CODES = {
    0x000B: true, 0xFFFE: true, 0xFFFF: true, 0x1FFFE: true,
    0x1FFFF: true, 0x2FFFE: true, 0x2FFFF: true, 0x3FFFE: true,
    0x3FFFF: true, 0x4FFFE: true, 0x4FFFF: true, 0x5FFFE: true,
    0x5FFFF: true, 0x6FFFE: true, 0x6FFFF: true, 0x7FFFE: true,
    0x7FFFF: true, 0x8FFFE: true, 0x8FFFF: true, 0x9FFFE: true,
    0x9FFFF: true, 0xAFFFE: true, 0xAFFFF: true, 0xBFFFE: true,
    0xBFFFF: true, 0xCFFFE: true, 0xCFFFF: true, 0xDFFFE: true,
    0xDFFFF: true, 0xEFFFE: true, 0xEFFFF: true, 0xFFFFE: true,
    0xFFFFF: true, 0x10FFFE: true, 0x10FFFF: true
};

//Exports const
exports.CHARS = {
    EOF: null,
    BOM: '\uFEFF',
    NULL: '\u0000',
    GRAVE_ACCENT: '\u0060',
    REPLACEMENT_CHARACTER: '\uFFFD'
};

//Exports
exports.asciiToLower = function (ch) {
    //NOTE: it's significantly faster than String.toLowerCase
    return String.fromCharCode(ch.charCodeAt(0) + 0x0020);
};

var isAsciiDigit = exports.isAsciiDigit = function (ch) {
    return ch >= '0' && ch <= '9';
};

exports.isAsciiAlphaNumeric = function (ch) {
    return isAsciiDigit(ch) || ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z';
};

exports.isIllegalCharCode = function (charCode) {
    return ILLEGAL_CHAR_CODES[charCode] ||
        charCode >= 0x0001 && charCode <= 0x0008 ||
        charCode >= 0x000E && charCode <= 0x001F ||
        charCode >= 0x007F && charCode <= 0x009F ||
        charCode >= 0xFDD0 && charCode <= 0xFDEF;
};

exports.isUnicodeReservedCharCode = function (charCode) {
    return charCode >= 0xD800 && charCode <= 0xDFFF || charCode > 0x10FFFF;
};

//NOTE: String.fromCharCode(), String.charCodeAt, etc. functions can handle only characters from BMP subset.
//So, we need to workaround this manually. Below are functions that are used to handle all available UTF-16 characters.
//(see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/fromCharCode#Getting_it_to_work_with_higher_values)
exports.getStringFromCharCode = function (charCode) {
    if (charCode <= 0xFFFF)
        return String.fromCharCode(charCode);

    charCode -= 0x10000;
    return String.fromCharCode(charCode >>> 10 & 0x3FF | 0xD800) + String.fromCharCode(0xDC00 | charCode & 0x3FF);
};

exports.isSurrogatePair = function (charCode1, charCode2) {
    return charCode1 >= 0xD800 && charCode1 <= 0xDBFF && charCode2 >= 0xDC00 && charCode2 <= 0xDFFF;
};

exports.getSurrogatePairCharCode = function (charCode1, charCode2) {
    return (charCode1 - 0xD800) * 0x400 + 0x2400 + charCode2;
};
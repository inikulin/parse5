//Const
exports.CHARS = {
    EOF: null,
    BOM: '\uFEFF',
    NULL: '\u0000',
    GRAVE_ACCENT: '\u0060',
    REPLACEMENT_CHARACTER: '\uFFFD'
};

//Illegal char codes
exports.isIllegalCharCode = function (charCode) {
    //OPTIMIZATION: in most common cases HTML input characters are in BMP range. Reduce comparisons by checking only
    //this range.
    if (charCode < 0x1FFFE) {
        return charCode >= 0x0001 && charCode <= 0x0008 ||
            charCode >= 0x000E && charCode <= 0x001F ||
            charCode >= 0x007F && charCode <= 0x009F ||
            charCode >= 0xFDD0 && charCode <= 0xFDEF ||
            charCode === 0x000B || charCode === 0xFFFE || charCode === 0xFFFF;
    }

    //OPTIMIZATION: we have a worst case. Here we use straight comparison instead of hash-table which
    //gives about 5% performance boost
    return charCode === 0x1FFFE || charCode === 0x1FFFF || charCode === 0x2FFFE || charCode === 0x2FFFF ||
        charCode === 0x3FFFE || charCode === 0x3FFFF || charCode === 0x4FFFE || charCode === 0x4FFFF ||
        charCode === 0x5FFFE || charCode === 0x5FFFF || charCode === 0x6FFFE || charCode === 0x6FFFF ||
        charCode === 0x7FFFE || charCode === 0x7FFFF || charCode === 0x8FFFE || charCode === 0x8FFFF ||
        charCode === 0x9FFFE || charCode === 0x9FFFF || charCode === 0xAFFFE || charCode === 0xAFFFF ||
        charCode === 0xBFFFE || charCode === 0xBFFFF || charCode === 0xCFFFE || charCode === 0xCFFFF ||
        charCode === 0xDFFFE || charCode === 0xDFFFF || charCode === 0xEFFFE || charCode === 0xEFFFF ||
        charCode === 0xFFFFE || charCode === 0xFFFFF || charCode === 0x10FFFE || charCode === 0x10FFFF;
};

exports.isUnicodeReservedCharCode = function (charCode) {
    return charCode >= 0xD800 && charCode <= 0xDFFF || charCode > 0x10FFFF;
};

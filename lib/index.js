'use strict';

var Parser = require('./parser'),
    Serializer = require('./serializer');

/** @namespace parse5 */

/**
 * Parses HTML string.
 * @function
 * @memberof parse5
 * @name parse
 * @param {string} html
 * @param {ParserOptions} [options]
 * @returns {ASTNode<Document>} document
 * @example
 * var parse5 = require('parse5');
 *
 * var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 */
exports.parse = function parse(html, options) {
    var parser = new Parser(options);

    return parser.parse(html);
};

/**
 * Parses HTML fragment. Consider it as setting `innerHTML` to the `fragmentContext` element.
 * If `fragmentContext` is not specified then `<template>` element will be used.
 * @function
 * @memberof parse5
 * @name parseFragment
 * @param {ASTNode} [fragmentContext=ASTNode.<TemplateElement>]
 * @param {string} html
 * @param {ParserOptions} [options]
 * @returns {ASTNode<DocumentFragment>} documentFragment
 * @example
 * var parse5 = require('parse5');
 *
 * var documentFragment = parse5.parseFragment('<table></table>');
 *
 * //Parse html fragment in context of the parsed <table> element
 * var trFragment = parser.parseFragment(documentFragment.childNodes[0], '<tr><td>Shake it, baby</td></tr>');
 */
exports.parseFragment = function parseFragment(fragmentContext, html, options) {
    if (typeof fragmentContext === 'string') {
        html = fragmentContext;
        options = html;
    }

    var parser = new Parser(options);

    return parser.parseFragment(html, fragmentContext);
};

/**
 * Serializes AST node to HTML string.
 * @function
 * @memberof parse5
 * @name serialize
 * @param {ASTNode} node
 * @param {SerializerOptions} [options]
 * @returns {String} html
 * @example
 * var parse5 = require('parse5');
 *
 * var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 *
 * //Serialize document
 * var html = parse5.serialize(document);
 *
 * //Serialize <body> element content
 * var bodyInnerHtml = parse5.serialize(document.childNodes[0].childNodes[1]);
 */
exports.serialize = function (node, options) {
    var serializer = new Serializer(node, options);

    return serializer.serialize();
};

exports.treeAdapters = {
    default: require('./tree_adapters/default'),
    htmlparser2: require('./tree_adapters/htmlparser2')
};


// Streaming
exports.ParserStream = require('./parser/stream');
exports.SerializerStream = require('./serializer/stream');
exports.SAXParser = require('./sax');

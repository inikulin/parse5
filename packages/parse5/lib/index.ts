import { Parser, type ParserOptions } from './parser/index.js';

import type { DefaultTreeAdapterMap } from './tree-adapters/default.js';
import type { TreeAdapterTypeMap } from './tree-adapters/interface.js';

export { type DefaultTreeAdapterMap, defaultTreeAdapter } from './tree-adapters/default.js';
export type { TreeAdapter, TreeAdapterTypeMap } from './tree-adapters/interface.js';
export { type ParserOptions, /** @internal */ Parser } from './parser/index.js';
export { serialize, serializeOuter, type SerializerOptions } from './serializer/index.js';
export { ERR as ErrorCodes, type ParserError } from './common/error-codes.js';

/** @internal */
export * as foreignContent from './common/foreign-content.js';
/** @internal */
export * as html from './common/html.js';
/** @internal */
export * as Token from './common/token.js';
/** @internal */
export { Tokenizer, type TokenizerOptions, TokenizerMode, type TokenHandler } from './tokenizer/index.js';

// Shorthands

/**
 * Parses an HTML string.
 *
 * @param html Input HTML string.
 * @param options Parsing options.
 * @returns Document
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
 *
 * console.log(document.childNodes[1].tagName); //> 'html'
 *```
 */
export function parse<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    html: string,
    options?: ParserOptions<T>
): T['document'] {
    return Parser.parse(html, options);
}

/**
 * Parses an HTML fragment.
 *
 * @example
 *
 * ```js
 * const parse5 = require('parse5');
 *
 * const documentFragment = parse5.parseFragment('<table></table>');
 *
 * console.log(documentFragment.childNodes[0].tagName); //> 'table'
 *
 * // Parses the html fragment in the context of the parsed <table> element.
 * const trFragment = parse5.parseFragment(documentFragment.childNodes[0], '<tr><td>Shake it, baby</td></tr>');
 *
 * console.log(trFragment.childNodes[0].childNodes[0].tagName); //> 'td'
 * ```
 *
 * @param fragmentContext Parsing context element. If specified, given fragment will be parsed as if it was set to the context element's `innerHTML` property.
 * @param html Input HTML fragment string.
 * @param options Parsing options.
 * @returns DocumentFragment
 */
export function parseFragment<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    fragmentContext: T['parentNode'] | null,
    html: string,
    options: ParserOptions<T>
): T['documentFragment'];
export function parseFragment<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    html: string,
    options?: ParserOptions<T>
): T['documentFragment'];
export function parseFragment<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    fragmentContext: T['parentNode'] | null | string,
    html?: string | ParserOptions<T>,
    options?: ParserOptions<T>
): T['documentFragment'] {
    if (typeof fragmentContext === 'string') {
        options = html as ParserOptions<T>;
        html = fragmentContext;
        fragmentContext = null;
    }

    const parser = Parser.getFragmentParser(fragmentContext, options);

    parser.tokenizer.write(html as string, true);

    return parser.getFragment();
}

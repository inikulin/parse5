import { Parser, ParserOptions } from './parser/index.js';
import { Serializer, SerializerOptions } from './serializer/index.js';
import type { DefaultTreeAdapterMap } from './tree-adapters/default.js';
import type { TreeAdapterTypeMap } from './tree-adapters/interface.js';

// Shorthands
export function parse<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(html: string, options?: ParserOptions<T>) {
    const parser = new Parser(options);

    return parser.parse(html);
}

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

    const parser = new Parser(options);

    return parser.parseFragment(html as string, fragmentContext);
}

export function serialize<T extends TreeAdapterTypeMap = DefaultTreeAdapterMap>(
    node: T['parentNode'],
    options: SerializerOptions<T>
) {
    const serializer = new Serializer(node, options);

    return serializer.serialize();
}

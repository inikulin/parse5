import { Parser, ParserOptions } from './parser/index.js';
import { Serializer, SerializerOptions } from './serializer/index.js';
import { TreeAdapterTypeMap } from './treeAdapter.js';
import { DefaultAdapterMap } from './tree-adapters/default.js';

// Shorthands
export function parse<T extends TreeAdapterTypeMap = DefaultAdapterMap>(
    html: string,
    options?: ParserOptions<T>
): T['document'] {
    const parser = new Parser(options);

    return parser.parse(html);
}

export function parseFragment<T extends TreeAdapterTypeMap = DefaultAdapterMap>(
    html: string,
    options?: ParserOptions<T>,
    fragmentContext?: T['element']
): T['documentFragment'] {
    const parser = new Parser(options);

    return parser.parseFragment(html, fragmentContext);
}

export function serialize<T extends TreeAdapterTypeMap = DefaultAdapterMap>(
    node: T['node'],
    options?: SerializerOptions<T>
) {
    const serializer = new Serializer(node, options);

    return serializer.serialize();
}

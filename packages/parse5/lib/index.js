import { Parser } from './parser/index.js';
import { Serializer } from './serializer/index.js';

// Shorthands
export function parse(html, options) {
    const parser = new Parser(options);

    return parser.parse(html);
}

export function parseFragment(fragmentContext, html, options) {
    if (typeof fragmentContext === 'string') {
        options = html;
        html = fragmentContext;
        fragmentContext = null;
    }

    const parser = new Parser(options);

    return parser.parseFragment(html, fragmentContext);
}

export function serialize(node, options) {
    const serializer = new Serializer(node, options);

    return serializer.serialize();
}

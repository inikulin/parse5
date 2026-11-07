import { it, assert, describe, beforeEach, afterEach, vi, expect } from 'vitest';
import {
    parseFragment,
    parse,
    InsertionMode,
    serialize,
    defaultTreeAdapter,
    html,
    type ElementCreationContext,
    type TreeAdapter,
    type DefaultTreeAdapterMap,
} from 'parse5';
import type { Element, TextNode } from '../tree-adapters/default.js';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';
import type { Htmlparser2TreeAdapterMap } from 'parse5-htmlparser2-tree-adapter';

generateParsingTests(
    'parser',
    'Parser',
    {
        expectErrors: [
            //TODO(GH-448): Foreign content behaviour was updated in the HTML spec.
            //The old test suite still tests the old behaviour.
            '0.foreign-fragment',
            '1.foreign-fragment',
            '38.foreign-fragment',
            '40.foreign-fragment',
            '47.foreign-fragment',
            '48.foreign-fragment',
        ],
    },
    (test, opts) => ({
        node: test.fragmentContext ? parseFragment(test.fragmentContext, test.input, opts) : parse(test.input, opts),
    }),
);

generateParsingTests(
    'parser upstream',
    'Parser',
    {
        withoutErrors: true,
        suitePath: new URL('../../../../test/data/html5lib-tests/tree-construction', import.meta.url),
    },
    (test, opts) => ({
        node: test.fragmentContext ? parseFragment(test.fragmentContext, test.input, opts) : parse(test.input, opts),
    }),
);

describe('parser', () => {
    it('Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)', () => {
        const html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>';
        const document = parse(html, { treeAdapter: treeAdapters.htmlparser2 });

        assert.ok(treeAdapters.htmlparser2.isDocumentTypeNode(document.childNodes[0]));
        assert.strictEqual(
            (document.childNodes[0] as Htmlparser2TreeAdapterMap['documentType']).data,
            '!DOCTYPE html SYSTEM "about:legacy-compat"',
        );
    });

    // TODO: upstream to html5lib-tests
    describe('foreign elements do not select an insertion mode', () => {
        it.each([
            [
                '<table><td><svg><select><desc><table></table><td>x',
                '<table><tbody><tr><td><svg><select><desc><table></table></desc></select></svg></td><td>x</td></tr></tbody></table>',
            ],
            [
                '<svg><template><desc><table></table>x<p>y',
                '<svg><template><desc><table></table>x<p>y</p></desc></template></svg>',
            ],
            [
                '<table><svg><template><desc><select><template></template><td>x',
                '<svg><template><desc><select><template></template></select></desc></template></svg><table><tbody><tr><td>x</td></tr></tbody></table>',
            ],
        ])('%s', (input, expected) => {
            expect(serialize(parse(input))).toBe(`<html><head></head><body>${expected}</body></html>`);
        });

        it('foreign fragment context', () => {
            const svg = parseFragment('<svg><select>').childNodes[0] as Element;
            const fragment = parseFragment(svg.childNodes[0] as Element, '<p><table></table><div>x');

            expect(serialize(fragment)).toBe('<p></p><table></table><div>x</div>');
        });
    });

    // TODO: upstream to html5lib-tests
    it.each([
        // U+212A KELVIN SIGN is not an ASCII upper alpha: `toLowerCase` turns it into "k".
        ['<svg><a\u212A><desc></a\u212A>x', '<svg><a\u212A><desc></desc></a\u212A>x</svg>'],
        ['<svg><a\u212A><desc></ak>x', '<svg><a\u212A><desc>x</desc></a\u212A></svg>'],
    ])('foreign end tags are matched ASCII case-insensitively - %s', (input, expected) => {
        expect(serialize(parseFragment(input))).toBe(expected);
    });

    // TODO: upstream to html5lib-tests
    it('an unmatched foreign end tag at the root of a fragment is handed to the HTML rules', () => {
        const div = parseFragment('<div>').childNodes[0] as Element;
        const fragment = parseFragment(div, '<div><form></div><svg></form></svg><form>x');

        expect(serialize(fragment)).toBe('<div><form></form></div><svg></svg><form>x</form>');
    });

    it('a foreign `form` ancestor of the fragment context is not the form element pointer', () => {
        const svg = parseFragment('<svg><form><desc>').childNodes[0] as Element;
        const form = svg.childNodes[0] as Element;
        const fragment = parseFragment(form.childNodes[0] as Element, '<form>x');

        expect(serialize(fragment)).toBe('<form>x</form>');
    });

    describe("Regression - Don't inherit from Object when creating collections (GH-119)", () => {
        beforeEach(() => {
            // @ts-expect-error Adding unknown prototype method
            Object.prototype.heyYo = 123;
        });

        afterEach(() => {
            // @ts-expect-error Deleting unknown prototype property
            delete Object.prototype.heyYo;
        });

        it('parses correctly', () => {
            const fragment = parseFragment('<div id="123">', {
                treeAdapter: treeAdapters.htmlparser2,
            });

            assert.ok(treeAdapters.htmlparser2.isElementNode(fragment.childNodes[0]));
            assert.strictEqual(
                treeAdapters.htmlparser2.getAttrList(fragment.childNodes[0] as Htmlparser2TreeAdapterMap['element'])
                    .length,
                1,
            );
        });
    });

    it('Regression - DOCTYPE empty fields (GH-236)', () => {
        const document = parse('<!DOCTYPE>');
        const doctype = document.childNodes[0];

        expect(doctype).toHaveProperty('name', '');
        expect(doctype).toHaveProperty('publicId', '');
        expect(doctype).toHaveProperty('systemId', '');
    });

    // TODO: upstream to html5lib-tests
    it.each([
        // The last `<b>` removes the second one from the list of active formatting elements (Noah's Ark clause).
        // When that `b` is the current node, `</b>` only pops it: `<b id=1>` stays open.
        ['<b id=1><b><b><b><b></b></b></b></b>x', '<b id="1"><b><b><b><b></b></b></b></b>x</b>'],
        [
            '<b id=1><svg><desc><b><b><b><b></b></b></b></b>x',
            '<b id="1"><svg><desc><b><b><b><b></b></b></b></b>x</desc></svg></b>',
        ],
        // `<b id=1>` itself is not in scope, although another `b` is.
        [
            '<b id=1><svg><desc><b><b><b><b></b></b></b><i></b>x',
            '<b id="1"><svg><desc><b><b><b><b></b></b></b><i>x</i></b></desc></svg></b>',
        ],
    ])('adoption agency picks the right formatting element - %s', (input, expected) => {
        expect(serialize(parseFragment(input))).toBe(expected);
    });

    it('Regression - CRLF inside </noscript> (GH-710)', () => {
        const onParseError = vi.fn();
        parse('<!doctype html><noscript>foo</noscript\r\n>', { onParseError });

        expect(onParseError).not.toHaveBeenCalled();
    });

    it('Regression - numeric character reference for CR treated as whitespace (GH-1828)', () => {
        const bodyText = (html: string): string => {
            const document = parse(html);
            const htmlEl = document.childNodes[0] as Element;
            const body = htmlEl.childNodes[1] as Element;
            const text = body.childNodes[0] as TextNode;
            return text.value;
        };

        // &#32; is whitespace and does not insert a text node before body content.
        assert.strictEqual(bodyText('&#13;A'), bodyText('&#32;A'));
        assert.strictEqual(bodyText('&#x0D;A'), bodyText('&#32;A'));
        assert.ok(!bodyText('&#13;A').includes('\r'));
        assert.strictEqual(bodyText('&#13;A'), 'A');
    });

    // TODO: upstream to html5lib-tests
    it('end tag in body must not match a foreign element with the same tag ID', () => {
        // `<svg desc>` is foreign, so `</desc>` must not close the open `<b>`.
        const document = parse('<svg><desc><b>x</desc>y');

        const html = document.childNodes[0] as Element;
        const body = html.childNodes[1] as Element;
        const svg = body.childNodes[0] as Element;
        const desc = svg.childNodes[0] as Element;
        const b = desc.childNodes[0] as Element;

        expect(b.nodeName).toBe('b');
        expect(b.childNodes).toHaveLength(1);
        expect(b.childNodes[0].nodeName).toBe('#text');
        expect((b.childNodes[0] as TextNode).value).toBe('xy');
    });

    // TODO: upstream to html5lib-tests
    it('implied end tags are not generated for foreign elements', () => {
        const fragment = parseFragment('<form><svg><option></form><g>');

        assert.strictEqual(serialize(fragment), '<form><svg><option><g></g></option></svg></form>');
    });

    describe('Tree adapters', () => {
        it('should provide element creation context', () => {
            const contexts = new Map<string, ElementCreationContext<DefaultTreeAdapterMap>>();
            let rootContext: ElementCreationContext<DefaultTreeAdapterMap> | undefined;
            const treeAdapter: TreeAdapter<DefaultTreeAdapterMap> = {
                ...treeAdapters.default,
                onElementCreated(element, context) {
                    expect(treeAdapters.default.getParentNode(element)).toBeNull();

                    if (treeAdapters.default.getTagName(element) === 'html') rootContext = context;

                    const id = treeAdapters.default.getAttrList(element).find((attr) => attr.name === 'id')?.value;

                    if (id) contexts.set(id, context);
                },
            };

            const document = parse('<form id="form"><input id="normal"><template><input id="template"></template>', {
                treeAdapter,
            });

            expect(rootContext!.intendedParent).toBe(document);
            const normal = contexts.get('normal')!;
            expect(treeAdapters.default.getTagName(normal.intendedParent as Element)).toBe('form');
            expect(
                treeAdapters.default.getAttrList(normal.formElement!).find((attr) => attr.name === 'id')?.value,
            ).toBe('form');
            expect(normal.isInTemplate).toBe(false);

            const template = contexts.get('template')!;
            expect(template.intendedParent).toHaveProperty('nodeName', '#document-fragment');
            expect(template.formElement).toBe(normal.formElement);
            expect(template.isInTemplate).toBe(true);

            parse('<table><form id="foster-form"><input id="fostered"></table>', { treeAdapter });

            const fostered = contexts.get('fostered')!;
            expect(treeAdapters.default.getTagName(fostered.intendedParent as Element)).toBe('body');
            expect(
                treeAdapters.default.getAttrList(fostered.formElement!).find((attr) => attr.name === 'id')?.value,
            ).toBe('foster-form');
            expect(fostered.isInTemplate).toBe(false);
        });

        it('should support onItemPush and onItemPop', () => {
            const onItemPush = vi.fn();
            const onItemPop = vi.fn();
            const document = parse('<p><p>', {
                treeAdapter: {
                    ...treeAdapters.default,
                    onItemPush,
                    onItemPop,
                },
            });

            const htmlElement = document.childNodes[0];
            assert.ok(treeAdapters.default.isElementNode(htmlElement));
            const bodyElement = (htmlElement as Element).childNodes[1] as Element;
            assert.ok(treeAdapters.default.isElementNode(bodyElement));
            // Expect 5 opened elements; in order: html, head, body, and 2x p
            expect(onItemPush).toHaveBeenCalledTimes(5);
            expect(onItemPush).toHaveBeenNthCalledWith(1, htmlElement);
            expect(onItemPush).toHaveBeenNthCalledWith(3, bodyElement);
            // The last opened element is the second p
            expect(onItemPush).toHaveBeenLastCalledWith(bodyElement.childNodes[1]);
            // The second p isn't closed, plus we never pop body and html. Alas, only 2 pop events (head and p).
            expect(onItemPop).toHaveBeenCalledTimes(2);
            // The last pop event should be the first p.
            expect(onItemPop).toHaveBeenLastCalledWith(bodyElement.childNodes[0], bodyElement);
        });
    });

    describe('rawtext parsing', () => {
        it.each([
            ['iframe'],
            ['noembed'],
            ['noframes'],
            ['noscript'],
            ['script'],
            ['style'],
            ['textarea'],
            ['title'],
            ['xmp'],
        ])('<%s>', (tagName) => {
            const html = `<r><${tagName}><math id="</${tagName}><b>should be outside</b>">`;
            const fragment = parseFragment(html);

            expect(fragment.childNodes.length).toBe(1);
            const r = fragment.childNodes[0] as Element;
            expect(r.nodeName).toBe('r');
            expect(r.childNodes).toHaveLength(3);
            expect(r.childNodes.map((_) => _.nodeName)).toEqual([tagName, 'b', '#text']);

            const target = r.childNodes[0] as Element;
            expect(target.childNodes).toHaveLength(1);
            expect(target.childNodes[0].nodeName).toBe('#text');
            expect((target.childNodes[0] as TextNode).value).toBe('<math id="');

            const b = r.childNodes[1] as Element;
            expect(b.childNodes).toHaveLength(1);
            expect(b.childNodes[0].nodeName).toBe('#text');
            expect((b.childNodes[0] as TextNode).value).toBe('should be outside');
        });
    });
});

describe('InsertionMode', () => {
    it('should be exported and have stable numeric values', () => {
        assert.strictEqual(InsertionMode.INITIAL, 0);
        assert.strictEqual(InsertionMode.BEFORE_HTML, 1);
        assert.strictEqual(InsertionMode.IN_BODY, 6);
        assert.strictEqual(InsertionMode.AFTER_AFTER_FRAMESET, 22);
    });
});

// Behind 64 open elements, the stack of open elements is indexed, and the adoption agency leaves free slots.
const deepOpen = '<x-p>'.repeat(64);
const deepClose = '</x-p>'.repeat(64);

it.each([
    '<a><b><big><em><strong><div>X</a>Y</div>Z',
    '<b><em><foo><foo><foo><aside></b></em>Y</aside>Z',
    '<u><i><bar><b><center></i></u>x</b>y',
    '<cite><b><cite><i><cite><i><cite><i><div>X</b>TEST',
    '<a href=a>aa<marquee>aa<a href=b>bb</marquee>aa',
    '<a><p><a>x',
    '<li><div><li>x',
    '<dd><div><dt>x',
    '<ul><li><ol></li>x',
    '<p><button></p>x',
    '<h1><div><h2>x</h1>y',
    '<x-a><span></x-a>x',
    '<table><b><tr><td>aaa</td></tr>bbb</table>ccc',
    '<table><tr><td><select><td>x',
    '<svg><g><foo></g>x',
    '<x-a><form><span></form></x-a>x',
])('parses %s behind a deep stack as behind a shallow one', (input) => {
    expect(serialize(parseFragment(deepOpen + input))).toBe(deepOpen + serialize(parseFragment(input)) + deepClose);
});

it.each([0, 64])('closes elements in a fragment context outside HTML, SVG and MathML behind %i elements', (depth) => {
    const context = defaultTreeAdapter.createElement('c', html.NS.XML, []);
    const open = '<y>'.repeat(depth);

    expect(serialize(parseFragment(context, `${open}<x></x>after`))).toBe(`${open}<x></x>after${'</y>'.repeat(depth)}`);
});

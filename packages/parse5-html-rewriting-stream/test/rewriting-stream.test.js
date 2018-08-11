'use strict';

const assert = require('assert');
const dedent = require('dedent');
const RewritingStream = require('../lib');
const loadSAXParserTestData = require('../../../test/utils/load-sax-parser-test-data');
const { getStringDiffMsg, writeChunkedToStream, WritableStreamStub } = require('../../../test/utils/common');

const srcHtml = dedent`
    <!DOCTYPE html "">
    <html>
        <!-- comment1 -->
        <head /// 123>
        </head>
        <!-- comment2 -->
        <body =123>
            <div>Hey ya</div>
        </body>
    </html>
`;

function createRewriterTest({ src, expected, assignTokenHandlers = () => {} }) {
    return done => {
        const rewriter = new RewritingStream();
        const writable = new WritableStreamStub();

        writable.once('finish', () => {
            assert.ok(writable.writtenData === expected, getStringDiffMsg(writable.writtenData, expected));
            done();
        });

        rewriter.pipe(writable);

        assignTokenHandlers(rewriter);
        writeChunkedToStream(src, rewriter);
    };
}

// Raw data tests
loadSAXParserTestData().forEach(
    // NOTE: if we don't have any event handlers assigned, stream should use raw
    // data for the serialization, so serialized content should identical to the original.
    (test, idx) =>
        (exports[`RewritingStream - Raw token serialization - ${idx + 1}.${test.name}`] = createRewriterTest({
            src: test.src,
            expected: test.src
        }))
);

exports['RewritingStream - rewrite start tags'] = createRewriterTest({
    src: srcHtml,
    expected: dedent`
        <!DOCTYPE html "">
        <html>
            <!-- comment1 -->
            <body 123="">
            </head>
            <!-- comment2 -->
            <head =123="">
                <div>Hey ya</div>
            </body>
        </html>
    `,
    assignTokenHandlers: rewriter => {
        rewriter.on('startTag', token => {
            if (token.tagName === 'head') {
                token.tagName = 'body';
            } else if (token.tagName === 'body') {
                token.tagName = 'head';
            }

            rewriter.emitStartTag(token);
        });
    }
});

exports['RewritingStream - rewrite end tags'] = createRewriterTest({
    src: srcHtml,
    expected: dedent`
        <!DOCTYPE html "">
        <html>
            <!-- comment1 -->
            <head /// 123>
            </rewritten>
            <!-- comment2 -->
            <body =123>
                <div>Hey ya</rewritten>
            </rewritten>
        </rewritten>
    `,
    assignTokenHandlers: rewriter => {
        rewriter.on('endTag', token => {
            token.tagName = 'rewritten';

            rewriter.emitEndTag(token);
        });
    }
});

exports['RewritingStream - rewrite text'] = createRewriterTest({
    src: srcHtml,
    expected: dedent`
        <!DOCTYPE html "">
        <html>
            <!-- comment1 -->
            <head /// 123>
            </head>
            <!-- comment2 -->
            <body =123>
                <div>42</div>
            </body>
        </html>
    `,
    assignTokenHandlers: rewriter => {
        rewriter.on('text', token => {
            if (token.text.trim().length > 0) {
                token.text = '42';
            }

            rewriter.emitText(token);
        });
    }
});

exports['RewritingStream - rewrite comment'] = createRewriterTest({
    src: srcHtml,
    expected: dedent`
        <!DOCTYPE html "">
        <html>
            <!--42-->
            <head /// 123>
            </head>
            <!--42-->
            <body =123>
                <div>Hey ya</div>
            </body>
        </html>
    `,
    assignTokenHandlers: rewriter => {
        rewriter.on('comment', token => {
            token.text = '42';

            rewriter.emitComment(token);
        });
    }
});

exports['RewritingStream - rewrite doctype'] = createRewriterTest({
    src: srcHtml,
    expected: dedent`
        <!DOCTYPE html PUBLIC "42" "hey">
        <html>
            <!-- comment1 -->
            <head /// 123>
            </head>
            <!-- comment2 -->
            <body =123>
                <div>Hey ya</div>
            </body>
        </html>
    `,
    assignTokenHandlers: rewriter => {
        rewriter.on('doctype', token => {
            token.publicId = '42';
            token.systemId = 'hey';

            rewriter.emitDoctype(token);
        });
    }
});

exports['RewritingStream - emit multiple'] = createRewriterTest({
    src: srcHtml,
    expected: dedent`
        <!DOCTYPE html "">
        <wrap><html></wrap>
            <!-- comment1 -->
            <wrap><head 123=""></wrap>
            </head>
            <!-- comment2 -->
            <wrap><body =123=""></wrap>
                <wrap><div></wrap>Hey ya</div>
            </body>
        </html>
    `,
    assignTokenHandlers: rewriter => {
        rewriter.on('startTag', token => {
            rewriter.emitRaw('<wrap>');
            rewriter.emitStartTag(token);
            rewriter.emitRaw('</wrap>');
        });
    }
});

exports['RewritingStream - rewrite raw'] = createRewriterTest({
    src: srcHtml,
    expected: dedent`
        <!DOCTYPE html "">42
        <html>42
            <!-- comment1 -->42
            <head /// 123>42
            </head>42
            <!-- comment2 -->42
            <body =123>42
                <div>42Hey ya</div>42
            </body>42
        </html>42
    `,
    assignTokenHandlers: rewriter => {
        const rewriteRaw = (_, raw) => {
            rewriter.emitRaw(raw + '42');
        };

        rewriter
            .on('doctype', rewriteRaw)
            .on('startTag', rewriteRaw)
            .on('endTag', rewriteRaw)
            .on('comment', rewriteRaw);
    }
});

exports['RewritingStream - Should escape entities in attributes and text'] = createRewriterTest({
    src: dedent`
        <!DOCTYPE html "">
        <html>
            <head foo='bar"baz"'>
            </head>
            <body>
                <div>foo&amp;bar</div>
            </body>
        </html>
    `,
    expected: dedent`
        <!DOCTYPE html "">
        <html>
            <head foo="bar&quot;baz&quot;">
            </head>
            <body>
                <div>foo&amp;bar</div>
            </body>
        </html>
    `,
    assignTokenHandlers: rewriter => {
        rewriter.on('startTag', token => rewriter.emitStartTag(token));
        rewriter.on('text', token => rewriter.emitText(token));
    }
});

exports['Regression - RewritingStream - Last text chunk must be flushed (GH-271)'] = done => {
    const parser = new RewritingStream();
    let foundText = false;

    parser.on('text', ({ text }) => {
        foundText = true;
        assert.strictEqual(text, 'text');
    });

    parser.once('finish', () => {
        assert.ok(foundText);
        done();
    });

    parser.write('text');
    parser.end();
};

exports['Regression - RewritingStream - Should not accept binary input (GH-269)'] = () => {
    const stream = new RewritingStream();
    const buf = Buffer.from('test');

    assert.throws(() => stream.write(buf), TypeError);
};

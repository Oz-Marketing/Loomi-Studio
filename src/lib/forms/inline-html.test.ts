import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sanitizeInlineHtml } from './sanitize-inline';
import { FieldConsent } from './components/fields';
import { ColumnsBlock } from './components/Columns';

// These cover the two form-builder fixes:
//  1. Consent/Text widgets render author-supplied links (sanitized).
//  2. Columns blocks emit the data attribute the responsive stylesheets
//     key off to stack on mobile — gated on the stackOnMobile toggle.

describe('sanitizeInlineHtml', () => {
  it('keeps anchors with safe hrefs', () => {
    const out = sanitizeInlineHtml('See our <a href="https://example.com/privacy">Privacy Policy</a>.');
    expect(out).toContain('<a');
    expect(out).toContain('href="https://example.com/privacy"');
    expect(out).toContain('Privacy Policy');
  });

  it('keeps mailto/tel links', () => {
    expect(sanitizeInlineHtml('<a href="mailto:a@b.com">mail</a>')).toContain('href="mailto:a@b.com"');
    expect(sanitizeInlineHtml('<a href="tel:+15551234567">call</a>')).toContain('href="tel:+15551234567"');
  });

  it('strips script tags and inline event handlers', () => {
    const out = sanitizeInlineHtml('hi<script>alert(1)</script><a href="#" onclick="steal()">x</a>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('onclick');
  });

  it('strips javascript: hrefs', () => {
    const out = sanitizeInlineHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('drops disallowed block/embed tags but keeps their text', () => {
    const out = sanitizeInlineHtml('<div>keep me<iframe src="evil"></iframe></div>');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<div');
    expect(out).toContain('keep me');
  });
});

describe('FieldConsent', () => {
  it('renders an embedded link instead of escaping it', () => {
    const html = renderToStaticMarkup(
      React.createElement(FieldConsent, {
        label: 'I agree. See our <a href="https://ex.com/privacy">Privacy Policy</a>.',
        required: true,
      }),
    );
    // A real anchor tag, not escaped &lt;a&gt;
    expect(html).toContain('<a href="https://ex.com/privacy"');
    expect(html).not.toContain('&lt;a');
    // Required asterisk still renders alongside the sanitized body.
    expect(html).toContain('*');
  });

  it('sanitizes malicious consent markup', () => {
    const html = renderToStaticMarkup(
      React.createElement(FieldConsent, {
        label: 'ok<script>alert(1)</script>',
      }),
    );
    expect(html).not.toContain('<script');
  });
});

describe('ColumnsBlock', () => {
  it('emits data-form-columns-row when stackOnMobile is on (default)', () => {
    const html = renderToStaticMarkup(
      React.createElement(ColumnsBlock, { children: React.createElement('span', null, 'c') }),
    );
    expect(html).toContain('data-form-columns-row');
  });

  it('omits data-form-columns-row when stackOnMobile is off', () => {
    const html = renderToStaticMarkup(
      React.createElement(ColumnsBlock, {
        stackOnMobile: false,
        children: React.createElement('span', null, 'c'),
      }),
    );
    expect(html).not.toContain('data-form-columns-row');
  });
});

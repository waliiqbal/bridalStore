import { plainToInstance } from 'class-transformer';
import { SanitizeHtml, sanitizeRichText } from './sanitize-html.js';

describe('sanitizeRichText', () => {
  it('keeps allowed formatting', () => {
    const html =
      '<h2>Care</h2><p><strong>Dry clean</strong> <em>only</em></p><ul><li>Chiffon</li></ul>' +
      '<table><tbody><tr><th colspan="2">Size</th></tr><tr><td>S</td><td>34</td></tr></tbody></table>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('keeps safe links and images', () => {
    expect(sanitizeRichText('<a href="/pages/shipping">Shipping</a>')).toBe(
      '<a href="/pages/shipping">Shipping</a>',
    );
    expect(sanitizeRichText('<a href="mailto:hi@example.com">Email</a>')).toBe(
      '<a href="mailto:hi@example.com">Email</a>',
    );
    expect(sanitizeRichText('<img src="https://cdn.example.com/a.webp" alt="A" />')).toBe(
      '<img src="https://cdn.example.com/a.webp" alt="A" />',
    );
    expect(sanitizeRichText('<img src="/uploads/images/a.webp" alt="A" />')).toBe(
      '<img src="/uploads/images/a.webp" alt="A" />',
    );
    expect(sanitizeRichText('<img src="http://localhost:3000/uploads/a.webp" />')).toBe(
      '<img src="http://localhost:3000/uploads/a.webp" />',
    );
  });

  it('adds rel="noopener noreferrer" to links opening a new tab', () => {
    expect(sanitizeRichText('<a href="https://x.com" target="_blank" rel="opener">X</a>')).toBe(
      '<a href="https://x.com" target="_blank" rel="noopener noreferrer">X</a>',
    );
  });

  it('turns h1 into h2 (the page title owns the h1)', () => {
    expect(sanitizeRichText('<h1>Title</h1>')).toBe('<h2>Title</h2>');
  });

  const xss: [string, string][] = [
    ['<script>alert(1)</script><p>ok</p>', '<p>ok</p>'],
    ['<p onclick="alert(1)">hi</p>', '<p>hi</p>'],
    ['<img src="https://x.com/a.png" onerror="alert(1)">', '<img src="https://x.com/a.png" />'],
    ['<img src=x onerror=alert(1)>', ''],
    ['<a href="javascript:alert(1)">x</a>', '<a>x</a>'],
    ['<a href="JaVaScRiPt:alert(1)">x</a>', '<a>x</a>'],
    ['<a href="&#106;avascript:alert(1)">x</a>', '<a>x</a>'],
    ['<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>', '<a>x</a>'],
    ['<a href="//evil.com">x</a>', '<a>x</a>'],
    ['<img src="data:image/svg+xml;base64,PHN2Zz4=">', ''],
    ['<img src="http://insecure.com/a.png">', ''],
    ['<img src="http://localhost.evil.com/a.png">', ''],
    ['<iframe src="https://evil.com"></iframe><p>ok</p>', '<p>ok</p>'],
    ['<p style="background:url(javascript:alert(1))">x</p>', '<p>x</p>'],
    ['<svg onload="alert(1)"><circle/></svg>', ''],
    ['<math><mtext><img src=x onerror=alert(1)></mtext></math>', ''],
    ['<form action="https://evil.com"><input name="card"></form>', ''],
    ['<object data="evil.swf"></object><embed src="evil.swf">', ''],
    ['<style>body{display:none}</style><p>ok</p>', '<p>ok</p>'],
    ['<div><p>ok</p></div>', '<p>ok</p>'],
    ['<<script>script>alert(1)<</script>/script>', '&lt;/script&gt;'],
  ];

  it.each(xss)('neutralises %s', (input, expected) => {
    const output = sanitizeRichText(input);
    expect(output).toBe(expected);
    expect(output).not.toMatch(/<script|onerror=|onclick=|javascript:|<iframe|style=/i);
  });
});

describe('@SanitizeHtml()', () => {
  class Dto {
    @SanitizeHtml()
    body?: string | null;
  }

  it('sanitizes the field during DTO transformation and leaves null alone', () => {
    expect(plainToInstance(Dto, { body: '<p onclick="x()">hi</p><script>1</script>' }).body).toBe(
      '<p>hi</p>',
    );
    expect(plainToInstance(Dto, { body: null }).body).toBeNull();
  });
});

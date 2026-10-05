import { Transform } from 'class-transformer';
import sanitize from 'sanitize-html';

const TRUSTED_IMAGE_SRC = /^(https:\/\/|\/uploads\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/)/;

// Allow-list for admin-written rich text. Anything not listed is removed:
// scripts, iframes, forms, style attributes, on* handlers, javascript: URLs.
const OPTIONS: sanitize.IOptions = {
  allowedTags: [
    'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'blockquote',
    'ul', 'ol', 'li',
    'a', 'strong', 'b', 'em', 'i', 'u', 's',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https', 'http'] },
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  // Content of these is dropped entirely, not unwrapped as text
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed'],
  transformTags: {
    // h1 is reserved for the page title
    h1: 'h2',
    a: (tagName, attribs) => {
      const attrs: Record<string, string> = { ...attribs };
      if (attrs.target && attrs.target !== '_blank') delete attrs.target;
      if (attrs.target === '_blank') attrs.rel = 'noopener noreferrer';
      return { tagName, attribs: attrs };
    },
  },
  exclusiveFilter: (frame) =>
    // Images: https, our own /uploads path, or local-dev uploads on localhost
    frame.tag === 'img' && !TRUSTED_IMAGE_SRC.test(frame.attribs.src ?? ''),
};

export function sanitizeRichText(html: string): string {
  return sanitize(html, OPTIONS).trim();
}

// DTO decorator: sanitizes on the way in, so stored HTML is always safe.
export function SanitizeHtml(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeRichText(value) : value,
  );
}

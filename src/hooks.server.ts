import type { Handle } from '@sveltejs/kit';

const BASE_SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-xss-protection': '0',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy':
    'accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), publickey-credentials-get=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'origin-agent-cluster': '?1'
};

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https:",
  "object-src 'none'",
  "media-src 'self'",
  "worker-src 'self'",
  "upgrade-insecure-requests"
].join('; ');

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  for (const [header, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!response.headers.has(header)) {
      response.headers.set(header, value);
    }
  }

  if (!response.headers.has('content-security-policy')) {
    response.headers.set('content-security-policy', CONTENT_SECURITY_POLICY);
  }

  if (event.url.pathname.startsWith('/emitir')) {
    response.headers.set('cache-control', 'no-store, max-age=0');
    response.headers.set('pragma', 'no-cache');
  }

  return response;
};

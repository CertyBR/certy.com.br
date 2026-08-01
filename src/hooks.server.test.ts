import { describe, expect, test, vi } from 'vitest';
import { handle } from './hooks.server';

function eventForPath(pathname: string): Parameters<typeof handle>[0]['event'] {
  return {
    url: new URL(`https://certy.test${pathname}`)
  } as Parameters<typeof handle>[0]['event'];
}

describe('security headers hook', () => {
  test('adds baseline security headers and content security policy', async () => {
    const response = await handle({
      event: eventForPath('/'),
      resolve: vi.fn().mockResolvedValue(new Response('ok'))
    });

    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-xss-protection')).toBe('0');
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('permissions-policy')).toContain('camera=()');
    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(response.headers.get('origin-agent-cluster')).toBe('?1');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
  });

  test('preserves headers already set by resolved responses', async () => {
    const response = await handle({
      event: eventForPath('/'),
      resolve: vi.fn().mockResolvedValue(
        new Response('ok', {
          headers: {
            'x-frame-options': 'SAMEORIGIN',
            'content-security-policy': "default-src 'none'"
          }
        })
      )
    });

    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'");
  });

  test('disables caching for certificate issuing sessions', async () => {
    const response = await handle({
      event: eventForPath('/emitir'),
      resolve: vi.fn().mockResolvedValue(new Response('ok'))
    });

    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('pragma')).toBe('no-cache');
  });
});

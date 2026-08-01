import { describe, expect, test, vi } from 'vitest';

type CertyApi = typeof import('./certy');

async function loadApi(publicEnv: Record<string, string | undefined>): Promise<CertyApi> {
  vi.resetModules();
  vi.doMock('$env/dynamic/public', () => ({
    env: publicEnv
  }));
  return import('./certy');
}

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

describe('certy api client', () => {
  test('reports and trims the configured API base URL', async () => {
    const api = await loadApi({
      PUBLIC_API_BASE_URL: ' https://api.certy.test/// '
    });

    expect(api.hasApiBaseUrl()).toBe(true);
    expect(api.getApiBaseUrl()).toBe('https://api.certy.test');
  });

  test('rejects API requests when the base URL is missing', async () => {
    const api = await loadApi({});

    await expect(api.getCertificateSession('session-1')).rejects.toThrow(
      'PUBLIC_API_BASE_URL não está definido. Configure o endpoint do proxy no arquivo .env.'
    );
  });

  test('creates certificate sessions with JSON headers and payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        session_id: 'session-1',
        status: 'awaiting_email_verification'
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const api = await loadApi({
      PUBLIC_API_BASE_URL: 'https://api.certy.test/'
    });

    const payload = await api.createCertificateSession({
      domain: 'example.com',
      email: 'ops@example.com',
      turnstile_token: 'token'
    });

    expect(payload.session_id).toBe('session-1');
    expect(fetchMock).toHaveBeenCalledWith('https://api.certy.test/api/v1/certificates/sessions', {
      method: 'POST',
      body: JSON.stringify({
        domain: 'example.com',
        email: 'ops@example.com',
        turnstile_token: 'token'
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  });

  test('encodes session identifiers for every session action', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({
        session_id: 'abc 123',
        status: 'pending_dns',
        message: 'ok',
        dns_ready: false,
        missing_records: []
      }))
    );
    vi.stubGlobal('fetch', fetchMock);
    const api = await loadApi({
      PUBLIC_API_BASE_URL: 'https://api.certy.test'
    });

    await api.getCertificateSession(' abc 123 ');
    await api.resendEmailVerificationCode('abc 123');
    await api.verifyEmailCode('abc 123', { code: '123456' });
    await api.checkCertificateDns('abc 123');
    await api.finalizeCertificateSession('abc 123');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.certy.test/api/v1/certificates/sessions/abc%20123',
      'https://api.certy.test/api/v1/certificates/sessions/abc%20123/verification-code',
      'https://api.certy.test/api/v1/certificates/sessions/abc%20123/verify-email',
      'https://api.certy.test/api/v1/certificates/sessions/abc%20123/dns-check',
      'https://api.certy.test/api/v1/certificates/sessions/abc%20123/finalize'
    ]);
  });

  test('rejects blank session identifiers', async () => {
    const api = await loadApi({
      PUBLIC_API_BASE_URL: 'https://api.certy.test'
    });

    expect(() => api.getCertificateSession('   ')).toThrow('Identificador de sessão inválido.');
  });

  test('checks certificates with encoded host query values', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        host: 'www.example.com',
        site_ok: true,
        site_error: null,
        redirects_to: null,
        cert: null,
        total_ct_certs: 0,
        active_ct_certs: 0
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const api = await loadApi({
      PUBLIC_API_BASE_URL: 'https://api.certy.test'
    });

    await api.checkCertificate('*.example.com');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.certy.test/api/v1/certificates/check?host=*.example.com',
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );
  });

  test('uses API error messages when requests fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'denied' }, { status: 403 })));
    const api = await loadApi({
      PUBLIC_API_BASE_URL: 'https://api.certy.test'
    });

    await expect(api.getCertificateSession('session-1')).rejects.toThrow('denied');
  });

  test('uses fallback API error messages when error responses are not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('not-json', { status: 502 })));
    const api = await loadApi({
      PUBLIC_API_BASE_URL: 'https://api.certy.test'
    });

    await expect(api.getCertificateSession('session-1')).rejects.toThrow(
      'Erro 502 ao chamar API'
    );
  });

  test('validates email addresses through the configured validation API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        valid: true,
        format_valid: true,
        is_disposable: false,
        dns_valid: true,
        provider: 'example'
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const api = await loadApi({
      PUBLIC_EMAIL_VALIDATION_API_URL: ' https://email.certy.test/validate/ '
    });

    const payload = await api.validateEmailAddress(' OPS@Example.COM ');

    expect(payload).toEqual({
      email: 'ops@example.com',
      valid: true,
      format_valid: true,
      domain: undefined,
      is_disposable: false,
      dns_valid: true,
      provider: 'example',
      errors: []
    });
    expect(fetchMock).toHaveBeenCalledWith('https://email.certy.test/validate?email=ops%40example.com', {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });
  });

  test('preserves email validation payload fields when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          email: 'user@example.com',
          valid: false,
          format_valid: true,
          domain: 'example.com',
          is_disposable: true,
          dns_valid: false,
          provider: 'mx',
          errors: ['blocked']
        })
      )
    );
    const api = await loadApi({});

    await expect(api.validateEmailAddress('user@example.com')).resolves.toMatchObject({
      email: 'user@example.com',
      domain: 'example.com',
      errors: ['blocked']
    });
  });

  test('rejects blank email validation input', async () => {
    const api = await loadApi({});

    await expect(api.validateEmailAddress('   ')).rejects.toThrow('Informe um e-mail.');
  });

  test('rejects invalid validation API protocols', async () => {
    const api = await loadApi({
      PUBLIC_EMAIL_VALIDATION_API_URL: 'ftp://email.certy.test/validate'
    });

    await expect(api.validateEmailAddress('ops@example.com')).rejects.toThrow(
      'PUBLIC_EMAIL_VALIDATION_API_URL deve usar http(s).'
    );
  });

  test('uses remote email validation errors when requests fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'invalid mailbox' }, { status: 422 }))
    );
    const api = await loadApi({});

    await expect(api.validateEmailAddress('ops@example.com')).rejects.toThrow('invalid mailbox');
  });

  test('uses fallback email validation errors when responses are not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('bad gateway', { status: 503 })));
    const api = await loadApi({});

    await expect(api.validateEmailAddress('ops@example.com')).rejects.toThrow(
      'Erro 503 ao validar e-mail'
    );
  });

  test('rejects empty successful email validation responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('', { status: 200 })));
    const api = await loadApi({});

    await expect(api.validateEmailAddress('ops@example.com')).rejects.toThrow(
      'Resposta vazia da API de validação de e-mail.'
    );
  });
});

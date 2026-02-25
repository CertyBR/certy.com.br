import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/public';

export type SessionStatus = 'pending_dns' | 'validating' | 'issued' | 'failed' | 'expired';

export interface DnsRecord {
  type?: string;
  record_type?: string;
  name: string;
  value: string;
}

export interface CreateSessionInput {
  domain: string;
  email: string;
}

export interface SessionPayload {
  session_id: string;
  status: SessionStatus;
  domain?: string;
  email?: string;
  dns_records?: DnsRecord[];
  created_at?: number;
  updated_at?: number;
  expires_at?: number;
  last_error?: string | null;
  message?: string;
  certificate_pem?: string | null;
  private_key_pem?: string | null;
}

export interface EmailValidationPayload {
  email: string;
  valid: boolean;
  format_valid: boolean;
  domain?: string;
  is_disposable: boolean;
  dns_valid: boolean;
  provider?: string;
  errors: string[];
}

interface ErrorPayload {
  error?: string;
}

const baseUrl = (PUBLIC_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const emailValidationApiUrl = (
  env.PUBLIC_EMAIL_VALIDATION_API_URL ?? 'https://api.likn.dev/v1/public/email-validation/validate'
)
  .trim()
  .replace(/\/+$/, '');

function ensureBaseUrl(): void {
  if (!baseUrl) {
    throw new Error(
      'PUBLIC_API_BASE_URL não está definido. Configure o endpoint do proxy no arquivo .env.'
    );
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  ensureBaseUrl();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {})
    }
  });

  const payload = await parseJson<ErrorPayload & T>(response);
  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Erro ${response.status} ao chamar API`;
    throw new Error(message);
  }

  return payload as T;
}

export function hasApiBaseUrl(): boolean {
  return Boolean(baseUrl);
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

export function createCertificateSession(input: CreateSessionInput): Promise<SessionPayload> {
  return request<SessionPayload>('/api/v1/certificates/sessions', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function getCertificateSession(sessionId: string): Promise<SessionPayload> {
  return request<SessionPayload>(`/api/v1/certificates/sessions/${sessionId}`);
}

export function finalizeCertificateSession(sessionId: string): Promise<SessionPayload> {
  return request<SessionPayload>(`/api/v1/certificates/sessions/${sessionId}/finalize`, {
    method: 'POST'
  });
}

export async function validateEmailAddress(email: string): Promise<EmailValidationPayload> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Informe um e-mail.');
  }

  const url = new URL(emailValidationApiUrl);
  url.searchParams.set('email', normalizedEmail);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  const payload = await parseJson<ErrorPayload & EmailValidationPayload>(response);
  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Erro ${response.status} ao validar e-mail`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error('Resposta vazia da API de validação de e-mail.');
  }

  return {
    email: payload.email ?? normalizedEmail,
    valid: Boolean(payload.valid),
    format_valid: Boolean(payload.format_valid),
    domain: payload.domain,
    is_disposable: Boolean(payload.is_disposable),
    dns_valid: Boolean(payload.dns_valid),
    provider: payload.provider,
    errors: Array.isArray(payload.errors) ? payload.errors : []
  };
}

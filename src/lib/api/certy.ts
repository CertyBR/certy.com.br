import { PUBLIC_API_BASE_URL } from '$env/static/public';

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

interface ErrorPayload {
  error?: string;
}

const baseUrl = (PUBLIC_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

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

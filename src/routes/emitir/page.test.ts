import { render, screen } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import IssuePage from './+page.svelte';

vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_API_BASE_URL: 'https://api.certy.test'
  }
}));

vi.mock('$lib/api/certy', () => ({
  hasApiBaseUrl: () => true,
  getCertificateSession: vi.fn().mockResolvedValue({
    session_id: 'session-1',
    status: 'awaiting_email_verification',
    domain: 'example.com',
    email: 'ops@example.com',
    dns_records: [],
    created_at: 1_700_000_000,
    expires_at: 1_700_003_600,
    email_verification_expires_at: 1_700_000_600,
    email_verification_resend_count: 0
  }),
  checkCertificateDns: vi.fn(),
  finalizeCertificateSession: vi.fn(),
  resendEmailVerificationCode: vi.fn(),
  verifyEmailCode: vi.fn()
}));

vi.mock('$lib/toast', () => ({
  notify: vi.fn()
}));

describe('certificate issuing session page', () => {
  test('renders the session loading state', () => {
    window.history.replaceState(null, '', '/emitir?session=session-1');

    render(IssuePage);

    expect(screen.getByRole('heading', { name: 'Acompanhar Sessão' })).toBeTruthy();
    expect(screen.getByText('Carregando sessão...')).toBeTruthy();
  });
});

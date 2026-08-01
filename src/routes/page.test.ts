import { render, screen } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import HomePage from './+page.svelte';
import TermsPage from './termos/+page.svelte';

vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_API_BASE_URL: 'https://api.certy.test',
    PUBLIC_EMAIL_VALIDATION_API_URL: 'https://email.certy.test/validate',
    PUBLIC_TURNSTILE_SITE_KEY: ''
  }
}));

describe('marketing pages', () => {
  test('renders the home page certificate issuing form', () => {
    render(HomePage);

    expect(screen.getByRole('heading', { name: 'Emitir Certificado' })).toBeTruthy();
    expect(screen.getByLabelText('Domínio')).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Criar sessão' }).hasAttribute('disabled')).toBe(false);
  });

  test('renders the terms page', () => {
    render(TermsPage);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Termos de Uso e Política de Privacidade' })
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Política de Privacidade' })
    ).toBeTruthy();
  });
});

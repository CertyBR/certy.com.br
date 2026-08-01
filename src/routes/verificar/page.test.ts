import { render, screen } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import VerifyPage from './+page.svelte';

vi.mock('$env/dynamic/public', () => ({
  env: {
    PUBLIC_API_BASE_URL: 'https://api.certy.test'
  }
}));

vi.mock('$lib/toast', () => ({
  notify: vi.fn()
}));

describe('certificate check page', () => {
  test('renders the SSL verification form', () => {
    render(VerifyPage);

    expect(
      screen.getByRole('heading', { name: 'Verificar Certificado SSL' })
    ).toBeTruthy();
    expect(screen.getByLabelText('Domínio ou URL')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verificar certificado' }).hasAttribute('disabled')).toBe(false);
  });
});

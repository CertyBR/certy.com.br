import { describe, expect, test, vi } from 'vitest';

type ToastModule = typeof import('./toast');

async function loadToast(browser: boolean): Promise<ToastModule> {
  vi.resetModules();
  vi.doMock('$app/environment', () => ({
    browser,
    building: false,
    dev: true,
    version: 'test'
  }));
  return import('./toast');
}

describe('toast notifier', () => {
  test('dispatches trimmed toast events in the browser', async () => {
    const listener = vi.fn();
    window.addEventListener('certy:toast', listener);
    const { notify } = await loadToast(true);

    notify('  Saved  ', 'success');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({
      message: 'Saved',
      tone: 'success'
    });
    window.removeEventListener('certy:toast', listener);
  });

  test('uses the info tone by default', async () => {
    const listener = vi.fn();
    window.addEventListener('certy:toast', listener);
    const { notify } = await loadToast(true);

    notify('Ready');

    expect(listener.mock.calls[0][0].detail).toEqual({
      message: 'Ready',
      tone: 'info'
    });
    window.removeEventListener('certy:toast', listener);
  });

  test('ignores empty messages', async () => {
    const listener = vi.fn();
    window.addEventListener('certy:toast', listener);
    const { notify } = await loadToast(true);

    notify('   ', 'error');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('certy:toast', listener);
  });

  test('does not dispatch events outside the browser', async () => {
    const listener = vi.fn();
    window.addEventListener('certy:toast', listener);
    const { notify } = await loadToast(false);

    notify('Hidden', 'info');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('certy:toast', listener);
  });
});

import { browser } from '$app/environment';

export type ToastTone = 'info' | 'success' | 'error';

interface ToastDetail {
  message: string;
  tone?: ToastTone;
}

export function notify(message: string, tone: ToastTone = 'info'): void {
  if (!browser) return;
  const trimmed = message.trim();
  if (!trimmed) return;

  window.dispatchEvent(
    new CustomEvent<ToastDetail>('certy:toast', {
      detail: { message: trimmed, tone }
    })
  );
}

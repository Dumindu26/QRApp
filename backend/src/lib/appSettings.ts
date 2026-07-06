import { pool } from '../db/database';

// Global, system-wide settings (not per-restaurant). Cached in memory and
// refreshed on write. Currently: the subscriptions master switch.

let cache = new Map<string, string>();

export const SUBSCRIPTIONS_ENABLED_KEY = 'subscriptions_enabled';
export const LOGIN_ICON_KEY = 'login_icon';
export const WHATSAPP_NUMBER_KEY = 'whatsapp_number';
export const DEMO_EMAIL_SUBJECT_KEY = 'demo_email_subject';
export const DEMO_EMAIL_BODY_KEY = 'demo_email_body';

export const DEFAULT_DEMO_EMAIL_SUBJECT = 'Your Order Live demo access';
export const DEFAULT_DEMO_EMAIL_BODY = `<p>Hi {{firstName}},</p>
<p>Thanks for requesting a demo of Order Live!</p>
<p>{{note}}</p>
<p>Here are your demo login credentials:</p>
<p><b>Username:</b> {{username}}<br/><b>Password:</b> {{password}}</p>
<p>Log in at <a href="https://orderlive.online">orderlive.online</a> to explore.</p>`;

export async function loadAppSettings(): Promise<void> {
  try {
    const res = await pool.query('SELECT key, value FROM app_settings');
    cache = new Map((res.rows as { key: string; value: string }[]).map((r) => [r.key, r.value]));
  } catch {
    cache = new Map();
  }
}

function getBool(key: string, def: boolean): boolean {
  const v = cache.get(key);
  return v == null ? def : v === 'true';
}

export async function setSetting(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value],
  );
  cache.set(key, value);
}

/** Whether the subscription/billing system is active. Defaults ON. */
export function subscriptionsEnabled(): boolean {
  return getBool(SUBSCRIPTIONS_ENABLED_KEY, true);
}

export async function setSubscriptionsEnabled(on: boolean): Promise<void> {
  await setSetting(SUBSCRIPTIONS_ENABLED_KEY, on ? 'true' : 'false');
}

/** App-wide login/brand icon, stored as a base64 data URL (or null if unset). */
export function getLoginIcon(): string | null {
  return cache.get(LOGIN_ICON_KEY) ?? null;
}

export async function setLoginIcon(dataUrl: string): Promise<void> {
  await setSetting(LOGIN_ICON_KEY, dataUrl);
}

/**
 * App-wide WhatsApp contact number (digits only, international format — e.g.
 * "94771234567"), shown as a click-to-chat button on the marketing site.
 * Returns null when unset/blank so the button can hide itself.
 */
export function getWhatsappNumber(): string | null {
  const v = cache.get(WHATSAPP_NUMBER_KEY);
  return v ? v : null;
}

export async function setWhatsappNumber(number: string): Promise<void> {
  await setSetting(WHATSAPP_NUMBER_KEY, number);
}

/** Editable "demo credentials" email template (subject + HTML body with {{placeholders}}). */
export function getDemoEmailTemplate(): { subject: string; body: string } {
  return {
    subject: cache.get(DEMO_EMAIL_SUBJECT_KEY) ?? DEFAULT_DEMO_EMAIL_SUBJECT,
    body: cache.get(DEMO_EMAIL_BODY_KEY) ?? DEFAULT_DEMO_EMAIL_BODY,
  };
}

export async function setDemoEmailTemplate(subject: string, body: string): Promise<void> {
  await setSetting(DEMO_EMAIL_SUBJECT_KEY, subject);
  await setSetting(DEMO_EMAIL_BODY_KEY, body);
}

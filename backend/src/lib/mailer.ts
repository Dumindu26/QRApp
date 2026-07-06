import { Resend } from 'resend';

// Transactional email (demo credentials, etc.) sent via Resend. Requires
// RESEND_API_KEY; the sending domain must be verified in Resend/DNS first.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'no-reply@orderlive.online';

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resend = getClient();
  if (!resend) throw new Error('RESEND_API_KEY is not configured');
  const { error } = await resend.emails.send({ from: `Order Live <${FROM_EMAIL}>`, to, subject, html });
  if (error) throw new Error(error.message);
}

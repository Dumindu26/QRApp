import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getLoginIcon, setLoginIcon, getWhatsappNumber, setWhatsappNumber,
  getDemoEmailTemplate, setDemoEmailTemplate,
} from '../lib/appSettings';

const router = Router();

// ── Public: app-wide branding the login/marketing pages need before auth ──────
router.get('/public', (_req, res) => {
  res.json({ loginIcon: getLoginIcon(), whatsappNumber: getWhatsappNumber() });
});

// ── Admin: set the login/brand icon (base64 data URL) ─────────────────────────
router.put('/login-icon', authenticate, requireRole('admin', 'super_admin'), async (req, res) => {
  const { dataUrl } = req.body as { dataUrl?: string };
  if (!dataUrl || !/^data:image\/[a-z+]+;base64,/i.test(dataUrl)) {
    res.status(400).json({ error: 'dataUrl (image data URL) is required' });
    return;
  }
  await setLoginIcon(dataUrl);
  res.json({ loginIcon: dataUrl });
});

// ── Super admin: set the WhatsApp contact number (digits only, or blank to clear) ──
router.put('/whatsapp', authenticate, requireRole('super_admin'), async (req, res) => {
  const raw = (req.body as { number?: string }).number ?? '';
  // Normalise: strip everything except digits (drops "+", spaces, dashes).
  const number = String(raw).replace(/\D/g, '');
  if (number && (number.length < 7 || number.length > 15)) {
    res.status(400).json({ error: 'WhatsApp number must be 7–15 digits in international format (e.g. 94771234567).' });
    return;
  }
  await setWhatsappNumber(number);
  res.json({ whatsappNumber: number || null });
});

// ── Super admin: view/edit the "demo credentials" email template ──────────────
router.get('/demo-email-template', authenticate, requireRole('super_admin'), (_req, res) => {
  res.json(getDemoEmailTemplate());
});

router.put('/demo-email-template', authenticate, requireRole('super_admin'), async (req, res) => {
  const { subject, body } = req.body as { subject?: string; body?: string };
  if (!subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'subject and body are required' });
    return;
  }
  await setDemoEmailTemplate(subject.trim(), body.trim());
  res.json({ subject: subject.trim(), body: body.trim() });
});

export default router;

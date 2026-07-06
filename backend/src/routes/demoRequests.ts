import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { pool } from '../db/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../lib/mailer';

const router = Router();

const STATUSES = ['open', 'sent', 'declined'] as const;
type Status = (typeof STATUSES)[number];

function toRequest(r: Record<string, unknown>) {
  return {
    id:             r.id as string,
    name:           r.name as string,
    email:          r.email as string,
    restaurantName: r.restaurant_name as string,
    phone:          r.phone as string,
    message:        r.message as string,
    status:         r.status as Status,
    demoUsername:   r.demo_username as string,
    adminNote:      r.admin_note as string,
    sentAt:         (r.sent_at as string | null) ?? undefined,
    createdAt:      r.created_at as string,
    updatedAt:      r.updated_at as string,
  };
}

// ── Public: marketing site "Request a demo" form ───────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, restaurantName, phone = '', message = '' } = req.body as {
    name?: string; email?: string; restaurantName?: string; phone?: string; message?: string;
  };
  if (!name?.trim() || !email?.trim() || !restaurantName?.trim()) {
    res.status(400).json({ error: 'name, email and restaurantName are required' }); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'Invalid email address' }); return;
  }

  const id = uuid();
  await pool.query(
    `INSERT INTO demo_requests (id, name, email, restaurant_name, phone, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, name.trim(), email.trim(), restaurantName.trim(), String(phone).trim(), String(message).trim()],
  );
  res.status(201).json({ id });
});

// ── Super admin: list all requests ──────────────────────────────────────────────
router.get('/', authenticate, requireRole('super_admin'), async (req: AuthRequest, res) => {
  const { status } = req.query as { status?: string };
  const conds: string[] = [];
  const params: unknown[] = [];
  if (status && STATUSES.includes(status as Status)) { params.push(status); conds.push(`status = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const result = await pool.query(`SELECT * FROM demo_requests ${where} ORDER BY created_at DESC`, params);
  res.json((result.rows as Record<string, unknown>[]).map(toRequest));
});

// ── Super admin: count of open submissions (for header badge) ─────────────────
router.get('/open-count', authenticate, requireRole('super_admin'), async (_req, res) => {
  const result = await pool.query("SELECT COUNT(*)::int AS n FROM demo_requests WHERE status = 'open'");
  res.json({ count: (result.rows[0] as { n: number }).n });
});

// ── Super admin: send demo credentials by email ────────────────────────────────
router.patch('/:id/send', authenticate, requireRole('super_admin'), async (req: AuthRequest, res) => {
  const { username, password, note = '' } = req.body as { username?: string; password?: string; note?: string };
  if (!username?.trim() || !password?.trim()) {
    res.status(400).json({ error: 'username and password are required' }); return;
  }

  const existing = await pool.query('SELECT * FROM demo_requests WHERE id = $1', [req.params.id]);
  if (!existing.rows.length) { res.status(404).json({ error: 'not found' }); return; }
  const request = existing.rows[0] as Record<string, unknown>;

  const html = `
    <p>Hi ${(request.name as string).split(' ')[0]},</p>
    <p>Thanks for requesting a demo of Order Live${note.trim() ? ` — ${note.trim()}` : ''}!</p>
    <p>Here are your demo login credentials:</p>
    <p><b>Username:</b> ${username.trim()}<br/><b>Password:</b> ${password.trim()}</p>
    <p>Log in at <a href="https://orderlive.online">orderlive.online</a> to explore.</p>
  `;

  try {
    await sendEmail(request.email as string, 'Your Order Live demo access', html);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to send email' }); return;
  }

  const result = await pool.query(
    `UPDATE demo_requests
        SET status = 'sent', demo_username = $1, admin_note = $2, sent_at = now(), updated_at = now()
      WHERE id = $3 RETURNING *`,
    [username.trim(), note.trim(), req.params.id],
  );
  res.json(toRequest(result.rows[0] as Record<string, unknown>));
});

// ── Super admin: decline a request (no email sent) ─────────────────────────────
router.patch('/:id', authenticate, requireRole('super_admin'), async (req: AuthRequest, res) => {
  const { status, adminNote } = req.body as { status?: string; adminNote?: string };
  const sets: string[] = [];
  const params: unknown[] = [];
  if (status !== undefined) {
    if (status !== 'declined' && status !== 'open') { res.status(400).json({ error: 'invalid status' }); return; }
    params.push(status); sets.push(`status = $${params.length}`);
  }
  if (adminNote !== undefined) { params.push(String(adminNote)); sets.push(`admin_note = $${params.length}`); }
  if (!sets.length) { res.status(400).json({ error: 'nothing to update' }); return; }

  sets.push('updated_at = now()');
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE demo_requests SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  if (!result.rows.length) { res.status(404).json({ error: 'not found' }); return; }
  res.json(toRequest(result.rows[0] as Record<string, unknown>));
});

export default router;

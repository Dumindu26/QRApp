import { Router } from 'express';
import { randomUUID as uuid } from 'crypto';
import { pool } from '../db/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

const STATUSES = ['open', 'in_progress', 'resolved', 'declined'] as const;
type Status = (typeof STATUSES)[number];

function toRequest(r: Record<string, unknown>) {
  return {
    id:            r.id as string,
    restaurantId:  r.restaurant_id as string,
    restaurantName: (r.restaurant_name as string | undefined) ?? undefined,
    submittedBy:   r.submitted_by as string,
    submitterName: r.submitter_name as string,
    type:          r.type as 'feature' | 'bug',
    title:         r.title as string,
    description:   r.description as string,
    status:        r.status as Status,
    adminNote:     r.admin_note as string,
    createdAt:     r.created_at as string,
    updatedAt:     r.updated_at as string,
  };
}

// ── Restaurant admin/manager: submit a feature request or bug report ──────────
router.post('/', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = req.user!.restaurantId;
  if (!rid) { res.status(400).json({ error: 'No restaurant context' }); return; }

  const { type, title, description = '' } = req.body as {
    type?: string; title?: string; description?: string;
  };
  if (type !== 'feature' && type !== 'bug') {
    res.status(400).json({ error: "type must be 'feature' or 'bug'" }); return;
  }
  if (!title?.trim()) { res.status(400).json({ error: 'title is required' }); return; }

  const id = uuid();
  const result = await pool.query(
    `INSERT INTO feature_requests (id, restaurant_id, submitted_by, submitter_name, type, title, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, rid, req.user!.id, req.user!.name ?? '', type, title.trim(), String(description).trim()],
  );
  res.status(201).json(toRequest(result.rows[0] as Record<string, unknown>));
});

// ── Restaurant admin/manager: list own restaurant's submissions ───────────────
router.get('/mine', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = req.user!.restaurantId;
  const result = await pool.query(
    'SELECT * FROM feature_requests WHERE restaurant_id = $1 ORDER BY created_at DESC',
    [rid],
  );
  res.json((result.rows as Record<string, unknown>[]).map(toRequest));
});

// ── Super admin: list all submissions (with restaurant name) ──────────────────
router.get('/', authenticate, requireRole('super_admin'), async (req: AuthRequest, res) => {
  const { status, type } = req.query as { status?: string; type?: string };
  const conds: string[] = [];
  const params: unknown[] = [];
  if (status && STATUSES.includes(status as Status)) { params.push(status); conds.push(`fr.status = $${params.length}`); }
  if (type === 'feature' || type === 'bug') { params.push(type); conds.push(`fr.type = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT fr.*, r.name AS restaurant_name
       FROM feature_requests fr
       LEFT JOIN restaurants r ON r.id = fr.restaurant_id
       ${where}
       ORDER BY fr.created_at DESC`,
    params,
  );
  res.json((result.rows as Record<string, unknown>[]).map(toRequest));
});

// ── Super admin: count of open submissions (for header badge) ─────────────────
router.get('/open-count', authenticate, requireRole('super_admin'), async (_req, res) => {
  const result = await pool.query("SELECT COUNT(*)::int AS n FROM feature_requests WHERE status = 'open'");
  res.json({ count: (result.rows[0] as { n: number }).n });
});

// ── Super admin: update status / add a note ───────────────────────────────────
router.patch('/:id', authenticate, requireRole('super_admin'), async (req: AuthRequest, res) => {
  const { status, adminNote } = req.body as { status?: string; adminNote?: string };
  const sets: string[] = [];
  const params: unknown[] = [];
  if (status !== undefined) {
    if (!STATUSES.includes(status as Status)) { res.status(400).json({ error: 'invalid status' }); return; }
    params.push(status); sets.push(`status = $${params.length}`);
  }
  if (adminNote !== undefined) { params.push(String(adminNote)); sets.push(`admin_note = $${params.length}`); }
  if (!sets.length) { res.status(400).json({ error: 'nothing to update' }); return; }

  sets.push('updated_at = now()');
  params.push(req.params.id);
  const result = await pool.query(
    `UPDATE feature_requests SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  if (!result.rows.length) { res.status(404).json({ error: 'not found' }); return; }
  res.json(toRequest(result.rows[0] as Record<string, unknown>));
});

export default router;

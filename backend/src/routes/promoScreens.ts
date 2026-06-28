import { Router } from 'express';
import { randomBytes, randomUUID as uuid } from 'crypto';
import { pool } from '../db/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

type ScreenRow = Record<string, unknown>;
type ItemRow = Record<string, unknown>;

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `screen-${Date.now()}`;
}

function cleanFitMode(value: unknown) {
  return value === 'contain' ? 'contain' : 'cover';
}

function toScreen(row: ScreenRow) {
  return {
    id: row.id as string,
    restaurantId: row.restaurant_id as string,
    name: row.name as string,
    slug: row.slug as string,
    token: row.token as string,
    active: row.active as boolean,
    rotationSeconds: Number(row.rotation_seconds),
    fitMode: row.fit_mode as 'cover' | 'contain',
    backgroundColor: row.background_color as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    itemCount: row.item_count != null ? Number(row.item_count) : undefined,
    activeItemCount: row.active_item_count != null ? Number(row.active_item_count) : undefined,
  };
}

function toItem(row: ItemRow) {
  return {
    id: row.id as string,
    screenId: row.screen_id as string,
    restaurantId: row.restaurant_id as string,
    title: row.title as string,
    subtitle: row.subtitle as string,
    imageUrl: row.image_url as string,
    linkUrl: (row.link_url as string | null) ?? null,
    active: row.active as boolean,
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function getAdminRestaurantId(req: AuthRequest, res: import('express').Response) {
  const rid = req.user?.restaurantId;
  if (!rid) {
    res.status(400).json({ error: 'restaurantId is required' });
    return null;
  }
  return rid;
}

router.get('/', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const result = await pool.query(
    `SELECT ps.*,
            COUNT(psi.id) AS item_count,
            COUNT(psi.id) FILTER (WHERE psi.active = TRUE) AS active_item_count
       FROM promo_screens ps
       LEFT JOIN promo_screen_items psi ON psi.screen_id = ps.id
      WHERE ps.restaurant_id = $1
      GROUP BY ps.id
      ORDER BY ps.created_at DESC`,
    [rid],
  );
  res.json((result.rows as ScreenRow[]).map(toScreen));
});

router.post('/', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const body = req.body as {
    name?: string;
    slug?: string;
    active?: boolean;
    rotationSeconds?: number;
    fitMode?: 'cover' | 'contain';
    backgroundColor?: string;
  };
  if (!body.name?.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = uuid();
  const now = new Date().toISOString();
  const slug = slugify(body.slug?.trim() || body.name);
  const token = randomBytes(24).toString('hex');
  const rotation = Math.min(Math.max(Number(body.rotationSeconds) || 12, 5), 120);

  try {
    await pool.query(
      `INSERT INTO promo_screens
       (id, restaurant_id, name, slug, token, active, rotation_seconds, fit_mode, background_color, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
      [
        id,
        rid,
        body.name.trim(),
        slug,
        token,
        body.active ?? true,
        rotation,
        cleanFitMode(body.fitMode),
        body.backgroundColor?.trim() || '#111827',
        now,
      ],
    );
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A promo screen with that slug already exists' });
      return;
    }
    throw err;
  }

  const row = await pool.query('SELECT * FROM promo_screens WHERE id = $1', [id]);
  res.status(201).json(toScreen(row.rows[0] as ScreenRow));
});

router.patch('/:id', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const existing = await pool.query('SELECT * FROM promo_screens WHERE id = $1 AND restaurant_id = $2', [req.params.id, rid]);
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const cur = existing.rows[0] as ScreenRow;
  const body = req.body as {
    name?: string;
    slug?: string;
    active?: boolean;
    rotationSeconds?: number;
    fitMode?: 'cover' | 'contain';
    backgroundColor?: string;
  };
  const rotation = body.rotationSeconds !== undefined
    ? Math.min(Math.max(Number(body.rotationSeconds) || 12, 5), 120)
    : Number(cur.rotation_seconds);

  try {
    await pool.query(
      `UPDATE promo_screens
          SET name=$1, slug=$2, active=$3, rotation_seconds=$4, fit_mode=$5, background_color=$6, updated_at=$7
        WHERE id=$8 AND restaurant_id=$9`,
      [
        body.name?.trim() || cur.name,
        body.slug !== undefined ? slugify(body.slug) : cur.slug,
        body.active !== undefined ? body.active : cur.active,
        rotation,
        body.fitMode !== undefined ? cleanFitMode(body.fitMode) : cur.fit_mode,
        body.backgroundColor?.trim() || cur.background_color,
        new Date().toISOString(),
        req.params.id,
        rid,
      ],
    );
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A promo screen with that slug already exists' });
      return;
    }
    throw err;
  }

  const updated = await pool.query('SELECT * FROM promo_screens WHERE id = $1', [req.params.id]);
  res.json(toScreen(updated.rows[0] as ScreenRow));
});

router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const result = await pool.query('DELETE FROM promo_screens WHERE id = $1 AND restaurant_id = $2', [req.params.id, rid]);
  if ((result.rowCount ?? 0) === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ success: true });
});

router.post('/:id/refresh', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const result = await pool.query(
    `UPDATE promo_screens
        SET updated_at = $1
      WHERE id = $2 AND restaurant_id = $3
      RETURNING *`,
    [new Date().toISOString(), req.params.id, rid],
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(toScreen(result.rows[0] as ScreenRow));
});

router.get('/:id/items', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const result = await pool.query(
    `SELECT psi.*
       FROM promo_screen_items psi
       JOIN promo_screens ps ON ps.id = psi.screen_id
      WHERE psi.screen_id = $1 AND ps.restaurant_id = $2
      ORDER BY psi.sort_order, psi.created_at`,
    [req.params.id, rid],
  );
  res.json((result.rows as ItemRow[]).map(toItem));
});

router.post('/:id/items', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const screen = await pool.query('SELECT id FROM promo_screens WHERE id = $1 AND restaurant_id = $2', [req.params.id, rid]);
  if (!screen.rows.length) {
    res.status(404).json({ error: 'Screen not found' });
    return;
  }

  const body = req.body as {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    linkUrl?: string | null;
    active?: boolean;
    sortOrder?: number;
  };
  if (!body.imageUrl?.trim()) {
    res.status(400).json({ error: 'imageUrl is required' });
    return;
  }

  const id = uuid();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO promo_screen_items
     (id, screen_id, restaurant_id, title, subtitle, image_url, link_url, active, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
    [
      id,
      req.params.id,
      rid,
      body.title?.trim() || '',
      body.subtitle?.trim() || '',
      body.imageUrl.trim(),
      body.linkUrl?.trim() || null,
      body.active ?? true,
      Number(body.sortOrder) || 0,
      now,
    ],
  );

  const row = await pool.query('SELECT * FROM promo_screen_items WHERE id = $1', [id]);
  res.status(201).json(toItem(row.rows[0] as ItemRow));
});

router.patch('/items/:itemId', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const existing = await pool.query(
    'SELECT * FROM promo_screen_items WHERE id = $1 AND restaurant_id = $2',
    [req.params.itemId, rid],
  );
  if (!existing.rows.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const cur = existing.rows[0] as ItemRow;
  const body = req.body as {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    linkUrl?: string | null;
    active?: boolean;
    sortOrder?: number;
  };
  if (body.imageUrl !== undefined && !body.imageUrl.trim()) {
    res.status(400).json({ error: 'imageUrl cannot be empty' });
    return;
  }

  await pool.query(
    `UPDATE promo_screen_items
        SET title=$1, subtitle=$2, image_url=$3, link_url=$4, active=$5, sort_order=$6, updated_at=$7
      WHERE id=$8 AND restaurant_id=$9`,
    [
      body.title !== undefined ? body.title.trim() : cur.title,
      body.subtitle !== undefined ? body.subtitle.trim() : cur.subtitle,
      body.imageUrl !== undefined ? body.imageUrl.trim() : cur.image_url,
      body.linkUrl !== undefined ? body.linkUrl?.trim() || null : cur.link_url,
      body.active !== undefined ? body.active : cur.active,
      body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : Number(cur.sort_order),
      new Date().toISOString(),
      req.params.itemId,
      rid,
    ],
  );
  const updated = await pool.query('SELECT * FROM promo_screen_items WHERE id = $1', [req.params.itemId]);
  res.json(toItem(updated.rows[0] as ItemRow));
});

router.delete('/items/:itemId', authenticate, requireRole('admin', 'manager'), async (req: AuthRequest, res) => {
  const rid = await getAdminRestaurantId(req, res);
  if (!rid) return;

  const result = await pool.query(
    'DELETE FROM promo_screen_items WHERE id = $1 AND restaurant_id = $2',
    [req.params.itemId, rid],
  );
  if ((result.rowCount ?? 0) === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ success: true });
});

router.get('/public/:token', async (req, res) => {
  const screenResult = await pool.query(
    `SELECT ps.*, r.name AS restaurant_name, r.logo AS restaurant_logo
       FROM promo_screens ps
       JOIN restaurants r ON r.id = ps.restaurant_id
      WHERE ps.token = $1 AND ps.active = TRUE`,
    [req.params.token],
  );
  if (!screenResult.rows.length) {
    res.status(404).json({ error: 'Display not found' });
    return;
  }

  const screen = screenResult.rows[0] as ScreenRow;
  const itemsResult = await pool.query(
    `SELECT *
       FROM promo_screen_items
      WHERE screen_id = $1 AND active = TRUE
      ORDER BY sort_order, created_at`,
    [screen.id],
  );

  res.json({
    screen: {
      ...toScreen(screen),
      restaurantName: screen.restaurant_name as string,
      restaurantLogo: (screen.restaurant_logo as string | null) ?? null,
    },
    items: (itemsResult.rows as ItemRow[]).map(toItem),
  });
});

export default router;

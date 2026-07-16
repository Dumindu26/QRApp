// Shared seed data for the sales sandbox tenant. Used by the one-off CLI
// script (db/seedDemoRestaurant.ts) AND by the demo-reset job (lib/demoReset.ts),
// which needs to repopulate historical orders after clearing transactional data.
import { randomUUID as uuid } from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db/database';
import { featuresForPlan } from './planStore';

export const DEMO_SLUG = 'demo';

const CATEGORY_IMAGES: Record<string, string> = {
  'Starters':  'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80',
  'Salads':    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  'Burgers':   'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
  'Pizza':     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'Desserts':  'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80',
  'Beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
};

const MENU: { category: string; name: string; price: number; description: string }[] = [
  { category: 'Starters', name: 'Crispy Calamari',     price: 950,  description: 'Lightly breaded calamari with marinara sauce' },
  { category: 'Starters', name: 'Chicken Wings',       price: 1100, description: 'BBQ or buffalo sauce, served with celery sticks' },
  { category: 'Starters', name: 'Garlic Bread',        price: 550,  description: 'Toasted with garlic butter and herbs' },
  { category: 'Salads',   name: 'Caesar Salad',        price: 900,  description: 'Romaine lettuce, croutons, parmesan, caesar dressing' },
  { category: 'Salads',   name: 'Greek Salad',         price: 850,  description: 'Cucumber, olives, feta, tomato, red onion' },
  { category: 'Burgers',  name: 'Classic Beef Burger', price: 1400, description: 'Beef patty, lettuce, tomato, pickles, special sauce' },
  { category: 'Burgers',  name: 'Chicken Burger',      price: 1250, description: 'Grilled chicken, coleslaw, mayo' },
  { category: 'Burgers',  name: 'Double Smash Burger', price: 1800, description: 'Two smash patties, cheese, caramelized onions' },
  { category: 'Pizza',    name: 'Margherita',          price: 1600, description: 'Tomato sauce, fresh mozzarella, basil' },
  { category: 'Pizza',    name: 'Pepperoni',           price: 1900, description: 'Tomato sauce, mozzarella, pepperoni' },
  { category: 'Pizza',    name: 'BBQ Chicken',         price: 2100, description: 'BBQ sauce, chicken, red onion, cilantro' },
  { category: 'Desserts', name: 'Chocolate Lava Cake', price: 850,  description: 'Warm chocolate cake with vanilla ice cream' },
  { category: 'Desserts', name: 'New York Cheesecake', price: 800,  description: 'Classic cheesecake with berry compote' },
  { category: 'Beverages',name: 'Fresh Lemonade',      price: 450,  description: 'Freshly squeezed lemon juice with mint' },
  { category: 'Beverages',name: 'Iced Coffee',         price: 500,  description: 'Cold brew over ice with milk' },
  { category: 'Beverages',name: 'Mango Smoothie',      price: 550,  description: 'Fresh mango blended with yogurt' },
];

const COMBOS: { name: string; description: string; price: number; itemNames: string[] }[] = [
  { name: 'Burger Combo', description: 'Any burger + fries + a soft drink', price: 1850, itemNames: ['Classic Beef Burger', 'Fresh Lemonade'] },
  { name: 'Pizza Night',  description: 'Margherita pizza + garlic bread + 2 drinks', price: 2400, itemNames: ['Margherita', 'Garlic Bread', 'Iced Coffee'] },
];

const TABLES = [1, 2, 3, 4, 5, 6, 7, 8].map((number) => ({ number, seats: number % 2 === 0 ? 4 : 2 }));

const STAFF = [
  { username: 'demo-waiter',  password: 'demo12345', name: 'Ayesha (Waiter)',    role: 'waiter'  },
  { username: 'demo-kitchen', password: 'demo12345', name: 'Kasun (Kitchen)',    role: 'kitchen' },
  { username: 'demo-cashier', password: 'demo12345', name: 'Nadeesha (Cashier)', role: 'cashier' },
];

const PROMO_CODES = [
  { code: 'WELCOME10', type: 'percentage', value: 10, minOrder: 0 },
  { code: 'FLAT500',   type: 'fixed',      value: 500, minOrder: 3000 },
];

const HISTORY_DAYS = 14;

async function upsertRestaurant(): Promise<string> {
  const existing = await pool.query('SELECT id FROM restaurants WHERE slug = $1', [DEMO_SLUG]);
  if (existing.rows.length) {
    const id = existing.rows[0].id as string;
    await pool.query(
      `UPDATE restaurants SET is_demo = TRUE, plan = 'pro', subscription_status = 'active',
              features = $1, active = TRUE, trial_ends_at = NULL
       WHERE id = $2`,
      [JSON.stringify(featuresForPlan('pro')), id],
    );
    return id;
  }
  const id = uuid();
  await pool.query(
    `INSERT INTO restaurants
       (id, name, slug, active, created_at, service_charge_pct, tax_pct, is_demo, plan, subscription_status, features, trial_ends_at, currency, city)
     VALUES ($1,$2,$3,TRUE,$4,10,0,TRUE,'pro','active',$5,NULL,'USD','Colombo')`,
    [id, 'Order Live Demo Bistro', DEMO_SLUG, new Date().toISOString(), JSON.stringify(featuresForPlan('pro'))],
  );
  return id;
}

async function upsertUser(restaurantId: string, username: string, password: string, name: string, role: string): Promise<string> {
  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length) return existing.rows[0].id as string;
  const id = uuid();
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (id, restaurant_id, username, password_hash, name, role) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, restaurantId, username, hash, name, role],
  );
  return id;
}

async function findOrCreateCategory(restaurantId: string, name: string): Promise<string> {
  const ex = await pool.query('SELECT id FROM categories WHERE restaurant_id = $1 AND LOWER(name) = LOWER($2)', [restaurantId, name]);
  if (ex.rows.length) return ex.rows[0].id as string;
  const id = uuid();
  await pool.query('INSERT INTO categories (id, restaurant_id, name) VALUES ($1,$2,$3)', [id, restaurantId, name]);
  return id;
}

async function seedMenu(restaurantId: string): Promise<Map<string, { id: string; price: number }>> {
  const categoryIds = new Map<string, string>();
  const itemsByName = new Map<string, { id: string; price: number }>();
  for (const item of MENU) {
    let catId = categoryIds.get(item.category);
    if (!catId) { catId = await findOrCreateCategory(restaurantId, item.category); categoryIds.set(item.category, catId); }
    const ex = await pool.query('SELECT id, price FROM menu_items WHERE restaurant_id = $1 AND LOWER(name) = LOWER($2)', [restaurantId, item.name]);
    if (ex.rows.length) { itemsByName.set(item.name, { id: ex.rows[0].id as string, price: Number(ex.rows[0].price) }); continue; }
    const id = uuid();
    const sortOrder = MENU.filter((m) => m.category === item.category).indexOf(item);
    await pool.query(
      `INSERT INTO menu_items
        (id, restaurant_id, name, description, price, discount_pct, category_id, image, available, track_stock, sort_order, tags, prep_time_mins, schedule_id)
       VALUES ($1,$2,$3,$4,$5,0,$6,$7,TRUE,FALSE,$8,'[]',NULL,NULL)`,
      [id, restaurantId, item.name, item.description, item.price, catId, CATEGORY_IMAGES[item.category] ?? null, sortOrder],
    );
    itemsByName.set(item.name, { id, price: item.price });
  }
  return itemsByName;
}

async function seedCombos(restaurantId: string, itemsByName: Map<string, { id: string; price: number }>): Promise<void> {
  for (const combo of COMBOS) {
    const ex = await pool.query('SELECT id FROM combos WHERE restaurant_id = $1 AND LOWER(name) = LOWER($2)', [restaurantId, combo.name]);
    if (ex.rows.length) continue;
    const comboId = uuid();
    await pool.query(
      `INSERT INTO combos (id, restaurant_id, name, description, price, active, sort_order, created_at) VALUES ($1,$2,$3,$4,$5,TRUE,0,$6)`,
      [comboId, restaurantId, combo.name, combo.description, combo.price, new Date().toISOString()],
    );
    let sortOrder = 0;
    for (const itemName of combo.itemNames) {
      const item = itemsByName.get(itemName);
      if (!item) continue;
      await pool.query(
        `INSERT INTO combo_items (id, combo_id, menu_item_id, quantity, sort_order) VALUES ($1,$2,$3,1,$4)`,
        [uuid(), comboId, item.id, sortOrder++],
      );
    }
  }
}

async function seedMenuSchedules(restaurantId: string): Promise<void> {
  const schedules = [
    { name: 'Breakfast', days: 'daily', start: '07:00', end: '11:00' },
    { name: 'Lunch',     days: 'daily', start: '11:00', end: '16:00' },
  ];
  for (const s of schedules) {
    const ex = await pool.query('SELECT id FROM menu_schedules WHERE restaurant_id = $1 AND LOWER(name) = LOWER($2)', [restaurantId, s.name]);
    if (ex.rows.length) continue;
    await pool.query(
      `INSERT INTO menu_schedules (id, restaurant_id, name, days, start_time, end_time, active, created_at) VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
      [uuid(), restaurantId, s.name, s.days, s.start, s.end, new Date().toISOString()],
    );
  }
}

async function seedTables(restaurantId: string): Promise<{ id: string; number: number }[]> {
  const out: { id: string; number: number }[] = [];
  for (const t of TABLES) {
    const ex = await pool.query('SELECT id FROM tables WHERE restaurant_id = $1 AND number = $2', [restaurantId, t.number]);
    if (ex.rows.length) { out.push({ id: ex.rows[0].id as string, number: t.number }); continue; }
    const id = uuid();
    await pool.query('INSERT INTO tables (id, restaurant_id, number, seats, active) VALUES ($1,$2,$3,$4,TRUE)', [id, restaurantId, t.number, t.seats]);
    out.push({ id, number: t.number });
  }
  return out;
}

async function seedPromoCodes(restaurantId: string): Promise<void> {
  for (const p of PROMO_CODES) {
    const ex = await pool.query('SELECT id FROM promo_codes WHERE restaurant_id = $1 AND code = $2', [restaurantId, p.code]);
    if (ex.rows.length) continue;
    await pool.query(
      `INSERT INTO promo_codes (id, restaurant_id, code, type, value, min_order, active, created_at) VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
      [uuid(), restaurantId, p.code, p.type, p.value, p.minOrder, new Date().toISOString()],
    );
  }
}

/** Insert two weeks of backdated, already-paid orders directly (bypassing
 * /api/orders) so no push/print/SMS side effect ever fires for historical data.
 * Safe to call repeatedly — no-ops once any order exists for the tenant. */
export async function reseedHistoricalOrders(restaurantId: string): Promise<number> {
  const existing = await pool.query('SELECT COUNT(*)::int AS n FROM orders WHERE restaurant_id = $1', [restaurantId]);
  if ((existing.rows[0] as { n: number }).n > 0) return 0;

  const itemRows = await pool.query('SELECT id, name, price FROM menu_items WHERE restaurant_id = $1', [restaurantId]);
  const items = (itemRows.rows as { id: string; name: string; price: string }[]).map((r) => ({ id: r.id, name: r.name, price: Number(r.price) }));
  const tableRows = await pool.query('SELECT id, number FROM tables WHERE restaurant_id = $1', [restaurantId]);
  const tables = tableRows.rows as { id: string; number: number }[];
  const waiterRow = await pool.query(`SELECT id FROM users WHERE restaurant_id = $1 AND role = 'waiter' LIMIT 1`, [restaurantId]);
  const waiterId = (waiterRow.rows[0] as { id: string } | undefined)?.id ?? null;
  if (!items.length || !tables.length) return 0;

  const paymentMethods = ['cash', 'card'];
  let created = 0;
  for (let dayAgo = HISTORY_DAYS; dayAgo >= 0; dayAgo--) {
    const ordersToday = 3 + Math.floor(Math.random() * 4); // 3-6 orders/day
    for (let i = 0; i < ordersToday; i++) {
      const table = tables[Math.floor(Math.random() * tables.length)];
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - dayAgo);
      orderDate.setHours(11 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
      const createdAt = orderDate.toISOString();
      const itemCount = 1 + Math.floor(Math.random() * 3);
      const orderId = uuid();
      let total = 0;
      const chosen: { id: string; name: string; price: number; quantity: number }[] = [];
      for (let n = 0; n < itemCount; n++) {
        const item = items[Math.floor(Math.random() * items.length)];
        const quantity = 1 + Math.floor(Math.random() * 2);
        chosen.push({ ...item, quantity });
        total += item.price * quantity;
      }
      created++;
      await pool.query(
        `INSERT INTO orders
           (id, restaurant_id, table_id, table_number, order_type, status, total_amount, created_at, updated_at,
            order_number, payment_method, served_at, assigned_waiter_id)
         VALUES ($1,$2,$3,$4,'dine-in','paid',$5,$6,$6,$7,$8,$6,$9)`,
        [orderId, restaurantId, table.id, table.number, total, createdAt,
         `ORD-${String(created).padStart(4, '0')}`, paymentMethods[Math.floor(Math.random() * paymentMethods.length)], waiterId],
      );
      for (const c of chosen) {
        await pool.query(
          `INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity) VALUES ($1,$2,$3,$4,$5,$6)`,
          [uuid(), orderId, c.id, c.name, c.price, c.quantity],
        );
      }
    }
  }
  return created;
}

export interface DemoSeedResult {
  restaurantId: string;
  adminUsername: string;
  adminPassword: string;
  tables: { id: string; number: number }[];
  historicalOrdersCreated: number;
}

/** Idempotent — safe to run repeatedly (e.g. from the CLI script or after a schema change). */
export async function seedDemoRestaurant(adminUsername: string, adminPassword: string): Promise<DemoSeedResult> {
  const restaurantId = await upsertRestaurant();
  await upsertUser(restaurantId, adminUsername, adminPassword, 'Demo Admin', 'admin');
  for (const s of STAFF) await upsertUser(restaurantId, s.username, s.password, s.name, s.role);

  const itemsByName = await seedMenu(restaurantId);
  await seedCombos(restaurantId, itemsByName);
  await seedMenuSchedules(restaurantId);
  const tables = await seedTables(restaurantId);
  await seedPromoCodes(restaurantId);
  const historicalOrdersCreated = await reseedHistoricalOrders(restaurantId);

  return { restaurantId, adminUsername, adminPassword, tables, historicalOrdersCreated };
}

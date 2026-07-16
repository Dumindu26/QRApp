// Clears transactional data (orders, table sessions, refunds) for demo
// ("is_demo") tenants and repopulates history, so the sales sandbox never
// accumulates real order noise from live calls, or sits empty afterward.
// Deliberately does NOT touch menu/tables/staff/loyalty/promo config.
import { pool } from '../db/database';
import { reseedHistoricalOrders } from './demoSeedData';

const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // daily
const INITIAL_DELAY  = 30 * 1000;

/** Wipes transactional rows for one demo tenant and repopulates history.
 * Throws if the target restaurant is not marked is_demo — callers (the route
 * and the sweep) both rely on this to guarantee a real tenant is never touched. */
export async function resetDemoTenant(restaurantId: string): Promise<{ ordersCreated: number }> {
  const check = await pool.query('SELECT is_demo FROM restaurants WHERE id = $1', [restaurantId]);
  if (!check.rows.length) throw new Error('Restaurant not found');
  if ((check.rows[0] as { is_demo: boolean }).is_demo !== true) throw new Error('Restaurant is not a demo tenant');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE restaurant_id = $1)`, [restaurantId]);
    await client.query('DELETE FROM orders WHERE restaurant_id = $1', [restaurantId]);
    await client.query('DELETE FROM table_sessions WHERE restaurant_id = $1', [restaurantId]);
    await client.query('DELETE FROM refunds WHERE restaurant_id = $1', [restaurantId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  const ordersCreated = await reseedHistoricalOrders(restaurantId);
  return { ordersCreated };
}

async function sweep(): Promise<void> {
  try {
    const demos = await pool.query('SELECT id FROM restaurants WHERE is_demo = TRUE');
    for (const row of demos.rows as { id: string }[]) {
      await resetDemoTenant(row.id).catch((e) => console.error(`[demoReset] Failed for ${row.id}:`, e));
    }
  } catch {
    // non-fatal — will retry next tick
  }
}

export function startDemoReset(): void {
  setTimeout(() => { void sweep(); }, INITIAL_DELAY);
  setInterval(() => { void sweep(); }, CHECK_INTERVAL);
  console.log(`[demoReset] Started — nightly sweep every ${CHECK_INTERVAL / 3600000}h`);
}

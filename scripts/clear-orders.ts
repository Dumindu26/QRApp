/**
 * Clears all order-related data while preserving menu items, categories,
 * tables, rooms, users, and restaurant settings.
 *
 * Run from the backend directory:
 *   npx ts-node --project tsconfig.json ../scripts/clear-orders.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function clearOrders() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete in FK dependency order
    const steps: [string, string][] = [
      ['order_item_modifiers',      'DELETE FROM order_item_modifiers'],
      ['order_item_toppings',       'DELETE FROM order_item_toppings'],
      ['order_items',               'DELETE FROM order_items'],
      ['customer_push_subscriptions','DELETE FROM customer_push_subscriptions'],
      ['refunds',                   'DELETE FROM refunds'],
      ['loyalty_transactions',      'DELETE FROM loyalty_transactions'],
      ['orders',                    'DELETE FROM orders'],
      ['table_sessions',            'DELETE FROM table_sessions'],
    ];

    for (const [label, sql] of steps) {
      const res = await client.query(sql);
      console.log(`  ✓ ${label}: ${res.rowCount} rows deleted`);
    }

    // Reset order sequence counters on all restaurants
    const seqRes = await client.query(
      'UPDATE restaurants SET next_order_seq = 0'
    );
    console.log(`  ✓ restaurants.next_order_seq reset (${seqRes.rowCount} restaurants)`);

    await client.query('COMMIT');
    console.log('\n✅ Done — orders cleared, menu items untouched.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Rolled back due to error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearOrders();

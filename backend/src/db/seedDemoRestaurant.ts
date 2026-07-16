// CLI entry point — seeds (idempotently) the sales sandbox tenant
// ("Order Live Demo Bistro"): full Pro-tier feature access, a real
// menu/tables/staff, and two weeks of backdated order history so
// Dashboard/Reports/Staff Performance aren't empty on first login.
//
// Run with: npm run seed:demo (from backend/)
//
// Actual seed data/logic lives in lib/demoSeedData.ts so the demo-reset job
// can reuse it to repopulate history after clearing transactional data.
import 'dotenv/config';
import { pool } from './database';
import { seedDemoRestaurant } from '../lib/demoSeedData';

const ADMIN_USERNAME = process.env.DEMO_ADMIN_USERNAME?.trim() || 'demo';
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD?.trim() || 'demo12345';

async function main(): Promise<void> {
  const result = await seedDemoRestaurant(ADMIN_USERNAME, ADMIN_PASSWORD);

  console.log('\n─── Demo restaurant ready ───────────────────────────────');
  console.log(`Restaurant ID : ${result.restaurantId}`);
  console.log(`Admin login   : ${result.adminUsername} / ${result.adminPassword}`);
  console.log(`Historical orders created this run: ${result.historicalOrdersCreated}`);
  console.log('Table menu links (open directly, or view/print QR from Locations page):');
  for (const t of result.tables) console.log(`  Table ${t.number}: /menu/${t.id}`);
  console.log('──────────────────────────────────────────────────────────\n');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());

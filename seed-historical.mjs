import { seedHistoricalData } from './server/db.ts';

async function main() {
  console.log('Seeding historical data...');
  const result = await seedHistoricalData();
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

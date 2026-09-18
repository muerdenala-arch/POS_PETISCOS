import fs from 'fs';
import { query } from '../api/_lib/db.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Connecting to database...');
  try {
    const sql = fs.readFileSync('schema.sql', 'utf8');
    console.log('Executing schema.sql...');
    await query(sql);
    console.log('Schema executed successfully.');
  } catch (err) {
    console.error('Error executing schema:', err);
  }
}

main();

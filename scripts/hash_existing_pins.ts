/**
 * hash_existing_pins.ts — migra los PIN de `staff` de texto plano a hash bcrypt.
 *
 * Necesario una sola vez al pasar a login server-side (ver api/staff.ts). Es
 * idempotente: cualquier PIN que ya sea un hash bcrypt ($2...) se salta, así que
 * es seguro volver a correrlo.
 *
 * Uso: npx tsx --env-file=.env.local scripts/hash_existing_pins.ts
 */
import { query } from '../api/_lib/db.js';
import { hashPin } from '../api/_lib/auth.js';

async function main() {
  const staff = await query<{ id: string; name: string; pin: string }>('select id, name, pin from staff');

  let migrated = 0;
  let alreadyHashed = 0;

  for (const person of staff) {
    if (person.pin.startsWith('$2')) {
      alreadyHashed++;
      continue;
    }
    const hash = await hashPin(person.pin);
    await query('update staff set pin = $2 where id = $1', [person.id, hash]);
    migrated++;
    console.log(`  ✓ ${person.name} (${person.id})`);
  }

  console.log(`\nPINs migrados a hash: ${migrated}. Ya estaban hasheados: ${alreadyHashed}. Total: ${staff.length}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error migrando PINs:', err);
    process.exit(1);
  });

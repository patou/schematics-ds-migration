import { MigrationDefinition } from '../core/types';
import { lionToDsfr } from './lion-to-dsfr';

/** Registre des migrations disponibles. Ajoutez ici une nouvelle migration (ex: dsfr -> lion). */
export const MIGRATIONS: MigrationDefinition[] = [lionToDsfr];

export function getMigration(from: string, to: string): MigrationDefinition {
  const migration = MIGRATIONS.find((m) => m.from.id === from && m.to.id === to);
  if (!migration) {
    const available = MIGRATIONS.map((m) => `${m.from.id} -> ${m.to.id}`).join(', ');
    throw new Error(`Aucune migration de "${from}" vers "${to}". Migrations disponibles : ${available}.`);
  }
  return migration;
}

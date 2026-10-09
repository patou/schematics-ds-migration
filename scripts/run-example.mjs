#!/usr/bin/env node
/**
 * Copie une application d'exemple dans tmp/examples/<nom> puis y exécute les schematics
 * avec le CLI `schematics` (@angular-devkit/schematics-cli).
 *
 * Usage : node scripts/run-example.mjs [lion-app|lion-app-prefixed] [--steps=migrate,add-ds,remove-ds]
 * (le projet doit avoir été compilé au préalable : npm run build)
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--')) ?? 'lion-app';
const steps = (args.find((a) => a.startsWith('--steps='))?.slice(8) ?? 'migrate,add-ds,remove-ds').split(',');

const source = resolve(root, 'examples', name);
if (!existsSync(source)) {
  console.error(`Exemple inconnu : ${name}`);
  process.exit(1);
}
if (!existsSync(resolve(root, 'src/migrate/index.js'))) {
  console.error('Compilez le projet avant de lancer un exemple : npm run build');
  process.exit(1);
}

const target = resolve(root, 'tmp/examples', name);
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true, filter: (p) => !p.includes('node_modules') });
console.log(`Exemple copié dans ${target}\n`);

const prefix = name === 'lion-app-prefixed' ? ['--prefix=my'] : [];
const commands = {
  migrate: ['migrate', '--path=src/app', ...prefix],
  'add-ds': ['add-ds', '--ds=dsfr', '--skip-install'],
  'remove-ds': ['remove-ds', '--ds=lion', '--skip-install', '--ignore-remaining', ...prefix],
};

const cli = resolve(root, 'node_modules/@angular-devkit/schematics-cli/bin/schematics.js');
const collection = resolve(root, 'src/collection.json');
for (const step of steps) {
  const [schematic, ...options] = commands[step] ?? [];
  if (!schematic) {
    console.error(`Étape inconnue : ${step}`);
    process.exit(1);
  }
  console.log(`> schematics ${collection}:${schematic} ${options.join(' ')}`);
  const result = spawnSync(process.execPath, [cli, `${collection}:${schematic}`, ...options, '--dry-run=false'], {
    cwd: target,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log('');
}
console.log(`Résultat : ${target} (recherchez "TODO(ds-migration)")`);

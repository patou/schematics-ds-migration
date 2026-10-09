import { JsonValue } from '@angular-devkit/core';
import type { ProjectDefinition } from '@schematics/angular/utility';

const ASSET_TARGETS = ['build', 'test'];

function entryInput(entry: JsonValue): string | undefined {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && !Array.isArray(entry) && typeof entry['input'] === 'string') {
    return entry['input'] as string;
  }
  return undefined;
}

const normalizeAsset = (p: string) => p.replace(/^\.\//, '');

/** Ajoute des styles/scripts globaux (en tête de liste) dans les cibles build et test. */
export function addGlobalAssets(project: ProjectDefinition, kind: 'styles' | 'scripts', assets: string[]): string[] {
  const added: string[] = [];
  for (const targetName of ASSET_TARGETS) {
    const target = project.targets.get(targetName);
    if (!target) continue;
    // La cible test n'est modifiée que si elle déclare déjà la liste (ex : Karma).
    if (targetName !== 'build' && !Array.isArray(target.options?.[kind])) continue;
    target.options = target.options ?? {};
    const list = (Array.isArray(target.options[kind]) ? target.options[kind] : []) as JsonValue[];
    const existing = new Set(list.map(entryInput).filter((v): v is string => !!v).map(normalizeAsset));
    const missing = assets.filter((a) => !existing.has(normalizeAsset(a)));
    if (missing.length) {
      target.options[kind] = [...missing, ...list];
      added.push(...missing.map((m) => `${targetName}: ${m}`));
    }
  }
  return added;
}

/** Supprime des styles/scripts globaux de toutes les cibles et configurations. */
export function removeGlobalAssets(project: ProjectDefinition, kind: 'styles' | 'scripts', assets: string[]): string[] {
  const removed: string[] = [];
  const toRemove = new Set(assets.map(normalizeAsset));
  for (const [targetName, target] of project.targets) {
    const optionSets: [string, Record<string, JsonValue | undefined>][] = [];
    if (target.options) optionSets.push(['', target.options]);
    for (const [conf, opts] of Object.entries(target.configurations ?? {})) {
      if (opts) optionSets.push([conf, opts]);
    }
    for (const [conf, opts] of optionSets) {
      const list = opts[kind];
      if (!Array.isArray(list)) continue;
      const filtered = list.filter((entry) => {
        const input = entryInput(entry);
        const match = !!input && toRemove.has(normalizeAsset(input));
        if (match) removed.push(`${targetName}${conf ? `:${conf}` : ''}: ${input}`);
        return !match;
      });
      opts[kind] = filtered;
    }
  }
  return removed;
}

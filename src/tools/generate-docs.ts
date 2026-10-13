/**
 * Génère le guide de correspondance de chaque migration (docs/guides/<id>.md) à partir des mappings.
 *
 * Usage : npm run docs (ou node src/tools/generate-docs.js après compilation).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { GENERIC_ATTRIBUTES, GENERIC_EVENTS, TODO_MARKER, normalizeRule } from '../core/template-migrator';
import {
  AttributeRuleInput,
  ComponentMapping,
  ContentRule,
  DesignSystem,
  MappingStatus,
  MigrationDefinition,
  SlotRule,
} from '../core/types';
import { MIGRATIONS } from '../migrations';

export const GUIDES_DIR = 'docs/guides';

const STATUS_LABELS: Record<MappingStatus, string> = {
  auto: '✅ automatique',
  partial: '⚠️ partielle',
  manual: '❌ manuelle',
};

/** Échappe le texte pour une cellule de tableau Markdown. */
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function code(text: string): string {
  return `\`${text}\``;
}

function anchor(tag: string): string {
  return tag.replace(/[^a-z0-9-]/g, '');
}

function describeRule(input: AttributeRuleInput, kind: 'attribute' | 'event'): { target: string; notes: string } {
  const rule = normalizeRule(input)!;
  const notes: string[] = [];
  let target: string;
  if (rule.remove) {
    target = 'supprimé';
  } else if (!rule.to) {
    target = '— (TODO)';
  } else if (kind === 'event') {
    target = code(`(${rule.to})`);
  } else if (rule.twoWay) {
    target = `${code(`[(${rule.twoWay.to})]`)} / ${code(rule.to)}`;
  } else {
    target = code(rule.to);
  }
  if (rule.doc) notes.push(rule.doc);
  if (rule.boolean) notes.push('Attribut booléen : `x` devient `[x]="true"`.');
  if (rule.asProperty) notes.push('Valeur statique convertie en liaison de propriété.');
  if (rule.values) {
    notes.push(
      `Valeurs : ${Object.entries(rule.values)
        .map(([from, to]) => `${code(from)} → ${code(to)}`)
        .join(', ')}.`,
    );
  }
  if (rule.twoWay) notes.push(`Fusionné avec ${code(`(${rule.twoWay.event})`)} en liaison bidirectionnelle.`);
  if (rule.oneWayOnly) notes.push('Liaison bidirectionnelle impossible : convertie en liaison simple (TODO).');
  if (rule.replace) notes.push('Expression du gestionnaire adaptée (`$event`).');
  if (rule.imports?.length) notes.push(`Import : ${rule.imports.map((i) => code(i.name)).join(', ')}.`);
  if (rule.todo) notes.push(`TODO : ${rule.todo}`);
  return { target, notes: notes.join(' ') };
}

function rulesTable(
  title: string,
  rules: Record<string, AttributeRuleInput> | undefined,
  kind: 'attribute' | 'event',
  sourceName: (name: string) => string,
): string[] {
  const entries = Object.entries(rules ?? {});
  if (!entries.length) return [];
  const lines = [`**${title}**`, '', '| Source | Cible | Remarques |', '| --- | --- | --- |'];
  for (const [name, input] of entries) {
    const { target, notes } = describeRule(input, kind);
    lines.push(`| ${code(sourceName(name))} | ${cell(target)} | ${cell(notes)} |`);
  }
  lines.push('');
  return lines;
}

function describeSlot(rule: SlotRule): string {
  let text: string;
  if ('toAttribute' in rule) text = `Texte → attribut ${code(rule.toAttribute)}`;
  else if ('toContentSelector' in rule) text = `Projection de contenu ${code(rule.toContentSelector)}`;
  else if ('todo' in rule) text = `Supprimé — TODO : ${rule.todo}`;
  else text = 'Conservé (attribut `slot` retiré)';
  return rule.doc ? `${text}. ${rule.doc}` : text;
}

function describeContent(content: ContentRule | undefined): string | undefined {
  if (!content || content === 'keep') return undefined;
  return `Le contenu texte devient l'attribut ${code(content.toAttribute)}.`;
}

function targetLabel(mapping: ComponentMapping): string {
  if (!mapping.target) return '—';
  return mapping.target.startsWith('[') ? `directive ${code(mapping.target)}` : code(`<${mapping.target}>`);
}

function componentSection(mapping: ComponentMapping): string[] {
  const lines = [`### ${code(`<${mapping.source}>`)}`, ''];
  lines.push(`- **Cible** : ${targetLabel(mapping)}`);
  lines.push(`- **Conversion** : ${STATUS_LABELS[mapping.status]}${mapping.transform ? ' (transformation structurelle)' : ''}`);
  if (mapping.description) lines.push(`- **Description** : ${mapping.description}`);
  if (mapping.imports?.length) lines.push(`- **Imports** : ${mapping.imports.map((i) => code(i.name)).join(', ')}`);
  if (mapping.addAttributes && Object.keys(mapping.addAttributes).length) {
    lines.push(
      `- **Attributs ajoutés** : ${Object.entries(mapping.addAttributes)
        .map(([k, v]) => code(`${k}="${v}"`))
        .join(', ')}`,
    );
  }
  const content = describeContent(mapping.content);
  if (content) lines.push(`- **Contenu** : ${content}`);
  if (mapping.todo) lines.push(`- **TODO systématique** : ${mapping.todo}`);
  lines.push('');

  lines.push(...rulesTable('Attributs', mapping.attributes, 'attribute', (n) => n));
  lines.push(...rulesTable('Événements', mapping.events, 'event', (n) => `(${n})`));

  const slots = Object.entries(mapping.slots ?? {});
  if (slots.length) {
    lines.push('**Slots**', '', '| Slot | Conversion |', '| --- | --- |');
    for (const [name, rule] of slots) lines.push(`| ${code(`slot="${name}"`)} | ${cell(describeSlot(rule))} |`);
    lines.push('');
  }
  if (mapping.notes?.length) {
    lines.push('**Remarques**', '');
    for (const note of mapping.notes) lines.push(`- ${note}`);
    lines.push('');
  }
  if (mapping.target && !mapping.attributes && !mapping.events && !mapping.transform && !mapping.slots) {
    lines.push(
      `Aucun attribut spécifique : seuls les attributs communs (voir [Règles communes](#règles-communes)) sont convertis.`,
      '',
    );
  }
  return lines;
}

function designSystemSummary(role: string, ds: DesignSystem): string[] {
  const lines = [`- **${role}** : ${ds.name} — ${ds.description}`];
  if (ds.documentation) lines.push(`  - Documentation : ${ds.documentation}`);
  lines.push(`  - Packages : ${ds.packages.map((p) => code(`${p.name}@${p.version}`)).join(', ')}`);
  return lines;
}

/** Contenu Markdown du guide de correspondance d'une migration. */
export function renderMigrationGuide(migration: MigrationDefinition): string {
  const { from, to } = migration;
  const lines: string[] = [
    `# Guide de migration ${from.name} → ${to.name}`,
    '',
    '<!-- Fichier généré par `npm run docs` (src/tools/generate-docs.ts) : ne pas modifier manuellement. -->',
    '',
    ...designSystemSummary('Source', from),
    ...designSystemSummary('Cible', to),
    '',
    `Les éléments qui ne peuvent pas être convertis automatiquement sont signalés par un commentaire ${code(
      `<!-- ${TODO_MARKER}: ... -->`,
    )} ajouté au-dessus du composant.`,
    '',
    `Avec l'option ${code('--prefix')} (ex : ${code('my')}), le préfixe du design system est remplacé (${code(
      `<my-button>`,
    )} au lieu de ${code(`<${from.tagPrefix}button>`)}).`,
    '',
    '## Statuts',
    '',
    `- ${STATUS_LABELS.auto} : conversion complète.`,
    `- ${STATUS_LABELS.partial} : conversion automatique, certains attributs ou comportements sont à reprendre (TODO).`,
    `- ${STATUS_LABELS.manual} : pas d'équivalent, la balise est conservée avec un TODO.`,
    '',
    '## Correspondance des composants',
    '',
    `| ${from.name} | ${to.name} | Conversion | Description |`,
    '| --- | --- | --- | --- |',
  ];
  for (const m of migration.components) {
    lines.push(
      `| [${code(`<${m.source}>`)}](#${anchor(m.source)}) | ${targetLabel(m)} | ${STATUS_LABELS[m.status]} | ${cell(
        m.description ?? '',
      )} |`,
    );
  }
  const counts = (status: MappingStatus) => migration.components.filter((m) => m.status === status).length;
  lines.push(
    '',
    `${migration.components.length} composants : ${counts('auto')} automatiques, ${counts('partial')} partiels, ${counts(
      'manual',
    )} manuels.`,
    '',
    '## Règles communes',
    '',
    'Ces règles s’appliquent à tous les composants (sauf règle spécifique au composant).',
    '',
    ...rulesTable('Attributs communs', migration.commonAttributes, 'attribute', (n) => n),
    ...rulesTable('Événements communs', migration.commonEvents, 'event', (n) => `(${n})`),
    '**Attributs conservés tels quels** : ' +
      [...GENERIC_ATTRIBUTES, ...(migration.passthroughAttributes ?? [])].map(code).join(', ') +
      ', `aria-*`, `data-*`, directives structurelles (`*ngIf`, ...), références (`#ref`), `attr.*`, `i18n-*`.',
    '',
    '**Événements conservés tels quels** : ' +
      [...GENERIC_EVENTS, ...(migration.passthroughEvents ?? [])].map((e) => code(`(${e})`)).join(', ') +
      '.',
    '',
    'Tout autre attribut ou événement sans règle est supprimé et signalé par un TODO.',
    '',
    '## Détail par composant',
    '',
  );
  for (const m of migration.components) lines.push(...componentSection(m));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function guidePath(migration: MigrationDefinition, root = process.cwd()): string {
  return path.join(root, GUIDES_DIR, `${migration.id}.md`);
}

/** Écrit les guides de toutes les migrations. */
export function generateGuides(root = process.cwd()): string[] {
  return MIGRATIONS.map((migration) => {
    const file = guidePath(migration, root);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, renderMigrationGuide(migration));
    return file;
  });
}

if (require.main === module) {
  for (const file of generateGuides()) console.log(`Guide généré : ${path.relative(process.cwd(), file)}`);
}

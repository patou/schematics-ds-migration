import { HtmlAttribute } from './parser';

/**
 * Nature d'un attribut dans un template Angular.
 *
 * - `static`     : `label="Nom"`
 * - `property`   : `[label]="expr"` / `bind-label="expr"`
 * - `twoWay`     : `[(value)]="expr"` / `bindon-value="expr"`
 * - `event`      : `(click)="fn()"` / `on-click="fn()"`
 * - `attr`       : `[attr.aria-label]`, `[class.x]`, `[style.x]` (liaisons DOM natives)
 * - `structural` : `*ngIf`, `*ngFor`
 * - `reference`  : `#ref` / `ref-ref`
 * - `i18n`       : `i18n`, `i18n-label`
 * - `animation`  : `@trigger`, `[@trigger]`, `(@trigger.done)`
 * - `let`        : `let-item` (ng-template)
 */
export type AttributeKind =
  | 'static'
  | 'property'
  | 'twoWay'
  | 'event'
  | 'attr'
  | 'structural'
  | 'reference'
  | 'i18n'
  | 'animation'
  | 'let';

export interface ParsedAttribute {
  raw: HtmlAttribute;
  kind: AttributeKind;
  /** Nom "logique" sans la syntaxe de liaison : `label`, `click`, `help-text`, `ngIf`, ... */
  name: string;
}

export function parseAttribute(raw: HtmlAttribute): ParsedAttribute {
  const n = raw.name;
  const make = (kind: AttributeKind, name: string): ParsedAttribute => ({ raw, kind, name });

  if (n.startsWith('[(') && n.endsWith(')]')) return make('twoWay', n.slice(2, -2));
  if (n.startsWith('bindon-')) return make('twoWay', n.slice(7));
  if (n.startsWith('[@') || n.startsWith('(@') || n.startsWith('@')) return make('animation', n);
  if (n.startsWith('[') && n.endsWith(']')) {
    const inner = n.slice(1, -1);
    if (/^(attr|class|style)\./.test(inner)) return make('attr', inner);
    return make('property', inner);
  }
  if (n.startsWith('bind-')) return make('property', n.slice(5));
  if (n.startsWith('(') && n.endsWith(')')) return make('event', n.slice(1, -1));
  if (n.startsWith('on-')) return make('event', n.slice(3));
  if (n.startsWith('*')) return make('structural', n.slice(1));
  if (n.startsWith('#')) return make('reference', n.slice(1));
  if (n.startsWith('ref-')) return make('reference', n.slice(4));
  if (n.startsWith('let-')) return make('let', n.slice(4));
  if (n === 'i18n' || n.startsWith('i18n-')) return make('i18n', n === 'i18n' ? '' : n.slice(5));
  return make('static', n);
}

/** `help-text` -> `helpText` */
export function camelCase(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** `helpText` -> `help-text` */
export function kebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Sérialise un attribut Angular.
 *
 * @param kind nature de l'attribut (détermine la syntaxe `[x]`, `(x)`, ...)
 * @param name nom de l'input/output cible
 * @param value valeur (expression ou littéral), `undefined` pour un attribut sans valeur
 * @param quote quote à utiliser (celle d'origine par défaut)
 */
export function formatAttribute(
  kind: 'static' | 'property' | 'twoWay' | 'event',
  name: string,
  value: string | undefined,
  quote: string = '"',
): string {
  const q = quote || '"';
  const wrapped = (n: string) => (value === undefined ? n : `${n}=${q}${value}${q}`);
  switch (kind) {
    case 'static':
      return wrapped(name);
    case 'property':
      return wrapped(`[${name}]`);
    case 'twoWay':
      return wrapped(`[(${name})]`);
    case 'event':
      return wrapped(`(${name})`);
  }
}

/** Échappe une chaîne pour l'insérer dans une valeur d'attribut HTML délimitée par `quote`. */
export function escapeAttributeValue(value: string, quote: string = '"'): string {
  return quote === "'" ? value.replace(/'/g, '&#39;') : value.replace(/"/g, '&quot;');
}

/** Transforme un texte en littéral de chaîne TypeScript (quotes simples). */
export function toStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')}'`;
}

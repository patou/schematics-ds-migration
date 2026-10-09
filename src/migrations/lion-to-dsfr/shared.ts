import { NGX_DSFR } from '../../design-systems/dsfr';
import { AttributeRuleInput, ImportSpec } from '../../core/types';
import { ParsedAttribute, escapeAttributeValue } from '../../core/html/attribute';
import { ElementNode, HtmlNode, elementChildren } from '../../core/html/parser';
import { shorten, toQuotedLiteral, TransformContext } from '../../core/template-migrator';

export const FORMS_MODULE: ImportSpec = { name: 'FormsModule', from: '@angular/forms' };

export function dsfr(name: string): ImportSpec {
  return { name, from: NGX_DSFR };
}

export const VALIDATORS_TODO =
  "Les validateurs Lion ([validators]) ne sont pas supportés : utilisez les Validators Angular (ngModel / FormControl) et les inputs error / message de ngx-dsfr.";

/** Attributs communs aux champs de formulaire Lion (FormControlMixin) -> DefaultControlComponent ngx-dsfr. */
export const FIELD_ATTRIBUTES: Record<string, AttributeRuleInput> = {
  label: { to: 'label', doc: 'Libellé du champ.' },
  helpText: { to: 'hint', doc: "Texte d'aide." },
  name: 'name',
  disabled: { to: 'disabled', boolean: true },
  labelSrOnly: { to: 'labelSrOnly', boolean: true, doc: 'Libellé visible uniquement des lecteurs d’écran.' },
};

/** Attributs des champs texte Lion (LionInput) -> BaseInputComponent ngx-dsfr. */
export const INPUT_ATTRIBUTES: Record<string, AttributeRuleInput> = {
  ...FIELD_ATTRIBUTES,
  placeholder: 'placeholder',
  readonly: { to: 'readonly', boolean: true },
  readOnly: { to: 'readonly', boolean: true },
  autocomplete: 'autocomplete',
  required: { to: 'required', boolean: true },
  pattern: 'pattern',
  maxlength: { to: 'maxLength', asProperty: true },
  maxLength: { to: 'maxLength', asProperty: true },
  minlength: { to: 'minLength', asProperty: true },
  minLength: { to: 'minLength', asProperty: true },
};

/** Remplace `$event.target.<prop>` / `$event.detail.<prop>` par `$event`. */
export function eventValue(prop: string): [string, string][] {
  return [[`\\$event\\??\\.(target|detail)\\??\\.${prop}\\b`, '$event']];
}

export interface GroupOptions {
  /** Balise cible. */
  target: string;
  /** Attributs déjà convertis de l'élément. */
  attrs: string[];
  /** Slots convertis en attributs : `{ label: 'legend' }`. */
  slots?: Record<string, string>;
  /** Rendu personnalisé d'un enfant élément (sinon migration standard). */
  renderChild?: (child: ElementNode) => string;
}

/**
 * Rend un composant "groupe" : les slots texte deviennent des attributs, les autres enfants sont migrés.
 */
export function renderGroup(el: ElementNode, ctx: TransformContext, options: GroupOptions): string {
  const { attrs } = options;
  const exclude = new Set<HtmlNode>();
  for (const child of elementChildren(el)) {
    const slot = child.attrs.find((a) => a.name === 'slot')?.value;
    if (slot === undefined) continue;
    exclude.add(child);
    const attrName = options.slots?.[slot];
    if (!attrName) {
      ctx.todo(`Slot "${slot}" de <${el.name}> non pris en charge par <${options.target}> : ${shorten(ctx.raw(child))}`);
      continue;
    }
    const value = ctx.text(child);
    if (value && !attrs.some((a) => new RegExp(`^\\s*\\[?${attrName}\\]?=`).test(a))) {
      attrs.push(` ${attrName}="${escapeAttributeValue(value)}"`);
    }
  }

  let content = '';
  const children = el.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (exclude.has(child)) continue;
    const next = children[i + 1];
    if (child.type === 'text' && next && exclude.has(next) && /^\s*$/.test(child.value)) continue;
    content += child.type === 'element' && options.renderChild ? options.renderChild(child) : ctx.render(child);
  }
  if (exclude.size && /^\s*$/.test(content)) content = '';
  return ctx.buildElement(options.target, attrs, el.selfClosing ? undefined : content, el);
}

/** Ajoute la directive `dsfrFieldsetElement` sur le composant DSFR rendu (après les éventuels TODO). */
export function asFieldsetElement(html: string, ctx: TransformContext): string {
  const re = /^((?:\s*<!--(?:(?!-->)[\s\S])*-->)*\s*)<(dsfr-[\w-]+)(?![\w-])/;
  if (!re.test(html)) return html;
  ctx.addImport(dsfr('DsfrFieldsetElementDirective'));
  return html.replace(re, (_m, before: string, tag: string) =>
    /\sdsfrFieldsetElement[\s>=/]/.test(html) ? `${before}<${tag}` : `${before}<${tag} dsfrFieldsetElement`,
  );
}

/** Valeur d'un attribut sous forme d'expression TypeScript (littéral pour une valeur statique). */
export function attrExpression(attr: ParsedAttribute | undefined, quote = '"'): string | undefined {
  if (!attr) return undefined;
  const value = attr.raw.value;
  if (attr.kind === 'static') return value === undefined ? 'true' : toQuotedLiteral(value, quote);
  return value?.trim();
}

/**
 * Convertit un texte de template (avec interpolations éventuelles) en expression :
 * `France` -> `'France'`, `{{ c.name }}` -> `c.name`, `Prix {{ p }}` -> `` `Prix ${p}` ``.
 */
export function textExpression(text: string, quote = '"'): string {
  const single = /^\{\{((?:(?!\}\})[\s\S])*)\}\}$/.exec(text);
  if (single) return single[1].trim();
  if (!text.includes('{{')) return toQuotedLiteral(text, quote);
  const parts = text.split(/\{\{((?:(?!\}\})[\s\S])*)\}\}/);
  let out = '`';
  parts.forEach((part, i) => {
    out += i % 2 ? `\${${part.trim()}}` : part.replace(/[`\\]/g, '\\$&').replace(/\$\{/g, '\\${');
  });
  return out + '`';
}

/** Entoure de parenthèses une expression contenant un pipe (obligatoire dans un littéral objet/tableau). */
export function safeExpression<T extends string | undefined>(expr: T): T {
  if (expr === undefined) return expr;
  return (/(^|[^|])\|(?!\|)/.test(expr.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''")) ? `(${expr})` : expr) as T;
}

/** Retire `amount` caractères d'indentation en début de chaque ligne (hors première). */
export function dedent(text: string, amount: number): string {
  if (amount <= 0) return text;
  return text.replace(new RegExp(`\\n[ \\t]{1,${amount}}`, 'g'), '\n');
}

/** Ajoute `pad` au début de chaque ligne (hors première). */
export function indentBlock(text: string, pad: string): string {
  return text.replace(/\n(?=[^\n])/g, `\n${pad}`);
}

/** Supprime l'attribut `slot="name"` de la balise ouvrante d'un élément rendu. */
export function stripSlot(html: string, name: string): string {
  return html.replace(new RegExp(`\\s+slot=(["'])${name}\\1`), '');
}

/** Ajoute du texte (attributs) juste après le nom de la première balise d'un élément rendu. */
export function addToStartTag(html: string, attrs: string): string {
  return html.replace(/^((?:\s*<!--(?:(?!-->)[\s\S])*-->)*\s*<[\w-]+)/, `$1${attrs}`);
}

/** Déplace un bloc rendu de l'indentation `from` vers l'indentation `to` (lignes suivant la première). */
export function reindent(html: string, from: string, to: string): string {
  const delta = to.length - from.length;
  return delta >= 0 ? indentBlock(html, to.slice(from.length) || ' '.repeat(delta)) : dedent(html, -delta);
}

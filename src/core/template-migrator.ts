import { formatAttribute, parseAttribute, ParsedAttribute, camelCase, escapeAttributeValue } from './html/attribute';
import {
  ElementNode,
  HtmlNode,
  normalizeWhitespace,
  parseHtml,
  textContent,
  elementChildren,
  walkElements,
} from './html/parser';
import {
  AttributeRule,
  AttributeRuleInput,
  ComponentMapping,
  ImportSpec,
  MigrationDefinition,
  SlotRule,
} from './types';

/** Marqueur des commentaires ajoutés par la migration (facile à rechercher). */
export const TODO_MARKER = 'TODO(ds-migration)';

export interface MigrateTemplateOptions {
  /** Préfixe remplaçant celui du DS source, ex: `my` pour `<my-button>`. */
  prefix?: string;
}

export interface TemplateMigrationResult {
  content: string;
  changed: boolean;
  /** Imports TypeScript nécessaires aux composants cibles utilisés. */
  imports: ImportSpec[];
  /** Messages TODO ajoutés. */
  todos: string[];
  /** Balises source (sans préfixe utilisateur) rencontrées. */
  sourceTags: string[];
}

/** Attributs génériques (HTML / Angular) conservés tels quels sur tous les composants. */
export const GENERIC_ATTRIBUTES = new Set([
  'id',
  'class',
  'style',
  'title',
  'role',
  'slot',
  'ngClass',
  'ngStyle',
  'ngModel',
  'ngModelOptions',
  'formControl',
  'formControlName',
  'formGroup',
  'formGroupName',
  'formArrayName',
]);

/** Événements génériques (DOM / Angular) conservés tels quels. */
export const GENERIC_EVENTS = new Set([
  'click',
  'dblclick',
  'focus',
  'blur',
  'focusin',
  'focusout',
  'keydown',
  'keyup',
  'keypress',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'ngModelChange',
]);

export interface ConvertAttributesOptions {
  /** Noms d'attributs (nom logique) à ignorer car traités par la transformation. */
  exclude?: string[];
  /** Supprime l'attribut `slot` (cas d'un enfant de slot déplacé). */
  dropSlot?: boolean;
}

export interface RenderChildrenOptions {
  /** Noeuds à ne pas rendre. Les espaces qui les précèdent sont également retirés. */
  exclude?: Set<HtmlNode>;
}

/**
 * Contexte passé aux transformations personnalisées des composants.
 */
export interface TransformContext {
  readonly migration: MigrationDefinition;
  readonly mapping: ComponentMapping;
  readonly source: string;
  readonly prefix: string;
  /** Balise source préfixée, ex : `lion-tab` -> `my-tab`. */
  tag(source: string): string;
  /** L'élément est-il le composant source donné (`lion-radio`, ...) ? */
  is(el: HtmlNode, source: string): el is ElementNode;
  /** Ajoute un TODO au-dessus du composant en cours de migration. */
  todo(message: string): void;
  addImport(spec: ImportSpec): void;
  /** Migre (récursivement) un noeud. */
  render(node: HtmlNode): string;
  /** Migre (récursivement) les enfants d'un élément. */
  renderChildren(el: ElementNode, options?: RenderChildrenOptions): string;
  /** Convertit les attributs d'un élément selon les règles d'un mapping. */
  convertAttributes(el: ElementNode, mapping?: ComponentMapping, options?: ConvertAttributesOptions): string[];
  /** Assemble une balise à partir de ses attributs et de son contenu. */
  buildElement(tag: string, attrs: string[], content: string | undefined, el?: ElementNode): string;
  /** Contenu texte normalisé. */
  text(node: HtmlNode): string;
  /** Code source brut d'un noeud. */
  raw(node: HtmlNode): string;
  /** Indentation de la ligne où commence l'élément. */
  indent(el: ElementNode): string;
  /** Génère un identifiant unique dans le template, ex : `tab-1`. */
  uniqueId(base: string): string;
  /** Valeur d'un attribut (statique ou lié). */
  attr(el: ElementNode, name: string): ParsedAttribute | undefined;
  /** Enfants élément portant `slot="name"`. */
  slotted(el: ElementNode, name: string): ElementNode[];
}

/**
 * Migre un template Angular d'un design system vers un autre.
 *
 * Les balises du DS source sont remplacées par leurs équivalents ; tout ce qui ne peut être converti
 * automatiquement donne lieu à un commentaire `<!-- TODO(ds-migration): ... -->` au-dessus du composant.
 * Le reste du template est conservé à l'identique.
 */
export function migrateTemplate(
  template: string,
  migration: MigrationDefinition,
  options: MigrateTemplateOptions = {},
): TemplateMigrationResult {
  return new TemplateMigrator(template, migration, options).run();
}

class TemplateMigrator {
  private readonly prefix: string;
  private readonly byTag = new Map<string, ComponentMapping>();
  private readonly imports = new Map<string, ImportSpec>();
  private readonly todos: string[] = [];
  private readonly sourceTags = new Set<string>();
  private readonly usedIds = new Set<string>();
  /** Pile des listes de TODO des éléments en cours de transformation. */
  private readonly todoStack: string[][] = [];
  /** Profondeur dans un composant sans équivalent (évite les TODO en cascade). */
  private manualDepth = 0;

  constructor(
    private readonly source: string,
    private readonly migration: MigrationDefinition,
    options: MigrateTemplateOptions,
  ) {
    this.prefix = normalizePrefix(options.prefix);
    for (const mapping of migration.components) {
      this.byTag.set(this.tag(mapping.source), mapping);
    }
    for (const match of source.matchAll(/\bid=["']([^"']+)["']/g)) {
      this.usedIds.add(match[1]);
    }
  }

  run(): TemplateMigrationResult {
    const doc = parseHtml(this.source);
    // Toutes les balises source, y compris celles consommées par une transformation (lion-radio, ...).
    walkElements(doc.children, (el) => {
      const sourceName = this.sourceNameOf(el);
      if (sourceName) this.sourceTags.add(sourceName);
    });
    const content = doc.children.map((n) => this.render(n)).join('');
    return {
      content,
      changed: content !== this.source,
      imports: [...this.imports.values()],
      todos: this.todos,
      sourceTags: [...this.sourceTags],
    };
  }

  tag(source: string): string {
    return applyTagPrefix(source, this.prefix, this.migration.from.tagPrefix);
  }

  private sourceNameOf(el: ElementNode): string | undefined {
    const name = el.name.toLowerCase();
    const sourcePrefix = this.migration.from.tagPrefix;
    const prefix = this.tag(sourcePrefix);
    if (!name.startsWith(prefix)) return undefined;
    return this.prefix ? `${sourcePrefix}${name.slice(prefix.length)}` : name;
  }

  render(node: HtmlNode): string {
    if (node.type !== 'element') return this.raw(node);

    const mapping = this.byTag.get(node.name.toLowerCase());
    const sourceName = this.sourceNameOf(node);

    if (!mapping) {
      if (sourceName && this.manualDepth === 0) {
        return this.withTodos(node, [
          `<${node.name}> n'a pas d'équivalent connu dans ${this.migration.to.name} : migration manuelle nécessaire.`,
        ], () => this.renderUnchanged(node), true);
      }
      return this.renderUnchanged(node);
    }
    if (!mapping.target && !mapping.transform && this.manualDepth > 0) {
      return this.renderUnchanged(node);
    }

    return this.withTodos(node, [], (todos) => {
      if (mapping.todo) todos.push(mapping.todo);
      for (const spec of mapping.imports ?? []) this.addImport(spec);

      if (mapping.transform) {
        return mapping.transform(node, this.context(mapping));
      }
      if (!mapping.target) {
        if (!mapping.todo) {
          todos.push(
            `<${node.name}> n'a pas d'équivalent dans ${this.migration.to.name} : migration manuelle nécessaire.`,
          );
        }
        return this.renderUnchanged(node, true);
      }
      return this.defaultTransform(node, mapping);
    }, !mapping.target && !mapping.transform);
  }

  private withTodos(
    el: ElementNode,
    initial: string[],
    build: (todos: string[]) => string,
    manual = false,
  ): string {
    const todos = [...initial];
    this.todoStack.push(todos);
    if (manual) this.manualDepth++;
    let html: string;
    try {
      html = build(todos);
    } finally {
      this.todoStack.pop();
      if (manual) this.manualDepth--;
    }
    // Ne répète pas un TODO déjà présent juste au-dessus de l'élément (nouvelle exécution).
    const existing = this.precedingTodos(el);
    const unique = [...new Set(todos)].filter((t) => !existing.has(sanitizeComment(t)));
    if (!unique.length) return html;
    this.todos.push(...unique);

    const lineStart = this.source.lastIndexOf('\n', el.start - 1) + 1;
    const before = this.source.slice(lineStart, el.start);
    const separator = /^\s*$/.test(before) ? `\n${before}` : ' ';
    const comments = unique.map((t) => `<!-- ${TODO_MARKER}: ${sanitizeComment(t)} -->`).join(separator);
    return comments + separator + html;
  }

  /** Messages des commentaires TODO qui précèdent immédiatement l'élément. */
  private precedingTodos(el: ElementNode): Set<string> {
    const found = new Set<string>();
    let before = this.source.slice(0, el.start);
    const re = new RegExp(`<!--\\s*${TODO_MARKER.replace(/[()]/g, '\\$&')}:\\s*((?:(?!-->)[\\s\\S])*?)\\s*-->\\s*$`);
    for (;;) {
      const match = re.exec(before);
      if (!match) break;
      found.add(match[1]);
      before = before.slice(0, match.index);
    }
    return found;
  }

  private renderUnchanged(el: ElementNode, manual = false): string {
    if (manual) this.manualDepth++;
    try {
      const startTag = this.source.slice(el.start, el.startTagEnd);
      if (el.selfClosing || el.void) return startTag;
      const children = this.renderChildren(el);
      const endTag = el.endTagStart !== undefined ? this.source.slice(el.endTagStart, el.end) : '';
      return startTag + children + endTag;
    } finally {
      if (manual) this.manualDepth--;
    }
  }

  renderChildren(el: ElementNode, options: RenderChildrenOptions = {}): string {
    const exclude = options.exclude ?? new Set<HtmlNode>();
    const children = el.children;
    let out = '';
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (exclude.has(child)) continue;
      const next = children[i + 1];
      if (child.type === 'text' && next && exclude.has(next) && /^\s*$/.test(child.value)) {
        continue;
      }
      out += this.render(child);
    }
    if (exclude.size && /^\s*$/.test(out)) return '';
    return out;
  }

  todo(message: string): void {
    const current = this.todoStack[this.todoStack.length - 1];
    if (current) current.push(message);
    else this.todos.push(message);
  }

  addImport(spec: ImportSpec): void {
    this.imports.set(`${spec.from}#${spec.name}`, spec);
  }

  raw(node: HtmlNode): string {
    return this.source.slice(node.start, node.end);
  }

  indent(el: ElementNode): string {
    const lineStart = this.source.lastIndexOf('\n', el.start - 1) + 1;
    const match = /^[ \t]*/.exec(this.source.slice(lineStart, el.start));
    return match ? match[0] : '';
  }

  uniqueId(base: string): string {
    let i = 1;
    while (this.usedIds.has(`${base}-${i}`)) i++;
    const id = `${base}-${i}`;
    this.usedIds.add(id);
    return id;
  }

  private context(mapping: ComponentMapping): TransformContext {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      migration: this.migration,
      mapping,
      source: this.source,
      prefix: this.prefix,
      tag: (s) => self.tag(s),
      is: (el, s): el is ElementNode => el.type === 'element' && el.name.toLowerCase() === self.tag(s),
      todo: (m) => self.todo(m),
      addImport: (spec) => self.addImport(spec),
      render: (n) => self.render(n),
      renderChildren: (el, o) => self.renderChildren(el, o),
      convertAttributes: (el, m, o) => self.convertAttributes(el, m ?? mapping, o),
      buildElement: (tag, attrs, content, el) => self.buildElement(tag, attrs, content, el),
      text: (n) => normalizeWhitespace(textContent(n)),
      raw: (n) => self.raw(n),
      indent: (el) => self.indent(el),
      uniqueId: (b) => self.uniqueId(b),
      attr: (el, name) => findAttribute(el, name),
      slotted: (el, name) => slotted(el, name),
    };
  }

  private defaultTransform(el: ElementNode, mapping: ComponentMapping): string {
    const target = mapping.target!;
    const attrs = this.convertAttributes(el, mapping);
    const exclude = new Set<HtmlNode>();
    let content = '';

    // Slots
    for (const child of elementChildren(el)) {
      const slotAttr = child.attrs.find((a) => a.name === 'slot');
      if (!slotAttr || slotAttr.value === undefined) continue;
      const slotName = slotAttr.value;
      const rule: SlotRule | undefined = mapping.slots?.[slotName];
      if (!rule) {
        this.todo(`Slot "${slotName}" de <${el.name}> non pris en charge par <${target}> : ${shorten(this.raw(child))}`);
        exclude.add(child);
        continue;
      }
      if ('toAttribute' in rule) {
        exclude.add(child);
        if (elementChildren(child).some((c) => !isInlineFormatting(c))) {
          this.todo(`Contenu riche du slot "${slotName}" converti en texte dans "${rule.toAttribute}".`);
        }
        const value = normalizeWhitespace(textContent(child));
        if (value && !hasAttribute(attrs, rule.toAttribute)) {
          attrs.push(this.leadingFor(el, attrs) + `${rule.toAttribute}="${escapeAttributeValue(value)}"`);
        }
      } else if ('todo' in rule) {
        exclude.add(child);
        this.todo(`${rule.todo} (${shorten(this.raw(child))})`);
      }
    }

    // Contenu (hors slots convertis)
    const contentRule = mapping.content ?? 'keep';
    const contentNodes = el.children.filter((c) => !exclude.has(c));
    if (contentRule !== 'keep') {
      const value = normalizeWhitespace(contentNodes.map(textContent).join(''));
      const richChildren = contentNodes.filter(
        (c): c is ElementNode => c.type === 'element' && !isInlineFormatting(c),
      );
      if (richChildren.length) {
        this.todo(
          `Le contenu HTML de <${el.name}> n'est pas supporté par <${target}> (converti en "${contentRule.toAttribute}") : ${shorten(
            richChildren.map((c) => this.raw(c)).join(' '),
          )}`,
        );
      }
      if (value && !hasAttribute(attrs, contentRule.toAttribute)) {
        attrs.push(this.leadingFor(el, attrs) + `${contentRule.toAttribute}="${escapeAttributeValue(value)}"`);
      }
    } else {
      content = this.renderSlotAwareChildren(el, mapping, exclude);
    }

    for (const [name, value] of Object.entries(mapping.addAttributes ?? {})) {
      if (!hasAttribute(attrs, name)) attrs.push(this.leadingFor(el, attrs) + (value === '' ? name : `${name}="${value}"`));
    }

    return this.buildElement(target, attrs, el.selfClosing ? undefined : content, el);
  }

  /** Rend le contenu en remplaçant `slot="x"` par l'attribut de projection cible. */
  private renderSlotAwareChildren(el: ElementNode, mapping: ComponentMapping, exclude: Set<HtmlNode>): string {
    const children = el.children;
    let out = '';
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (exclude.has(child)) continue;
      const next = children[i + 1];
      if (child.type === 'text' && next && exclude.has(next) && /^\s*$/.test(child.value)) continue;
      if (child.type === 'element') {
        const slotAttr = child.attrs.find((a) => a.name === 'slot');
        const rule = slotAttr?.value !== undefined ? mapping.slots?.[slotAttr.value] : undefined;
        if (slotAttr && rule && ('toContentSelector' in rule || 'keep' in rule)) {
          const rendered = this.render(child);
          const replacement = 'toContentSelector' in rule ? rule.toContentSelector : '';
          out += replaceFirstAttribute(rendered, this.raw(child), slotAttr, replacement, this.source, child);
          continue;
        }
      }
      out += this.render(child);
    }
    if (exclude.size && /^\s*$/.test(out)) return '';
    return out;
  }

  buildElement(tag: string, attrs: string[], content: string | undefined, el?: ElementNode): string {
    const attrText = attrs.map((a) => (/^\s/.test(a) ? a : ` ${a}`)).join('');
    // Conserve un retour à la ligne avant `>` si la balise d'origine était sur plusieurs lignes.
    const trailing = el && attrs.length && /\n/.test(el.startTagTrailing) ? el.startTagTrailing : '';
    if (content === undefined) {
      return `<${tag}${attrText}${trailing || ' '}/>`;
    }
    return `<${tag}${attrText}${trailing}>${content}</${tag}>`;
  }

  private leadingFor(_el: ElementNode, attrs: string[]): string {
    const multiLine = attrs.find((a) => /^\s*\n/.test(a));
    if (multiLine) return /^\s*/.exec(multiLine)![0];
    return ' ';
  }

  convertAttributes(el: ElementNode, mapping: ComponentMapping, options: ConvertAttributesOptions = {}): string[] {
    const target = mapping.target ?? el.name;
    const parsed = el.attrs.map(parseAttribute);
    const handled = new Set<ParsedAttribute>();
    const out: string[] = [];
    const exclude = new Set((options.exclude ?? []).map((n) => camelCase(n)));

    const leading = (p: ParsedAttribute) => p.raw.leading || ' ';

    // Liaison bidirectionnelle : [modelValue]="x" + (model-value-changed)="x = $event..." => [(ngModel)]="x"
    for (const p of parsed) {
      if (p.kind !== 'property') continue;
      const rule = this.attributeRule(mapping, p.name);
      if (!rule?.twoWay) continue;
      const expr = (p.raw.value ?? '').trim();
      const event = parsed.find(
        (e) => e.kind === 'event' && e.name === rule.twoWay!.event && isAssignmentOf(e.raw.value ?? '', expr),
      );
      if (!event) continue;
      handled.add(p);
      handled.add(event);
      for (const spec of rule.imports ?? []) this.addImport(spec);
      out.push(leading(p) + formatAttribute('twoWay', rule.twoWay.to, expr, p.raw.quote));
    }

    for (const p of parsed) {
      if (handled.has(p)) continue;
      if (exclude.has(camelCase(p.name))) continue;
      const rawText = this.raw({ type: 'text', value: '', start: p.raw.start, end: p.raw.end });

      switch (p.kind) {
        case 'structural':
        case 'reference':
        case 'i18n':
        case 'animation':
        case 'attr':
        case 'let':
          out.push(leading(p) + rawText);
          continue;
        case 'event': {
          const rule = this.eventRule(mapping, p.name);
          if (!rule) {
            if (GENERIC_EVENTS.has(p.name) || this.migration.passthroughEvents?.includes(p.name)) {
              out.push(leading(p) + rawText);
            } else {
              this.todo(`Événement "(${p.name})" de <${el.name}> sans équivalent sur <${target}> : ${rawText}`);
            }
            continue;
          }
          const converted = this.applyRule(el, target, p, rule, rawText);
          if (converted) out.push(leading(p) + converted);
          continue;
        }
        default: {
          if (p.kind === 'static' && p.name === 'slot' && options.dropSlot) continue;
          const rule = this.attributeRule(mapping, p.name);
          if (!rule) {
            if (isGenericAttribute(p.name) || this.migration.passthroughAttributes?.includes(p.name)) {
              out.push(leading(p) + rawText);
            } else {
              this.todo(`Attribut "${p.name}" de <${el.name}> sans équivalent sur <${target}> : ${rawText}`);
            }
            continue;
          }
          const converted = this.applyRule(el, target, p, rule, rawText);
          if (converted) out.push(leading(p) + converted);
        }
      }
    }

    if (
      out.some((a) => /^\s*\(ngModelChange\)/.test(a)) &&
      !out.some((a) => /^\s*(\[\(?)?(ngModel|formControl|formControlName)(\)?\])?(=|$)/.test(a))
    ) {
      this.todo(
        `(ngModelChange) sur <${target}> nécessite une directive ngModel/formControl : ajoutez [(ngModel)] ou formControlName.`,
      );
    }
    return out;
  }

  private applyRule(
    el: ElementNode,
    target: string,
    p: ParsedAttribute,
    rule: AttributeRule,
    rawText: string,
  ): string | undefined {
    if (rule.remove) return undefined;
    for (const spec of rule.imports ?? []) this.addImport(spec);
    if (!rule.to) {
      this.todo(rule.todo ?? `"${p.name}" de <${el.name}> sans équivalent sur <${target}> : ${rawText}`);
      return undefined;
    }
    if (rule.todo) this.todo(rule.todo);
    if (p.kind === 'event') {
      let handler = p.raw.value;
      if (handler !== undefined && rule.replace) {
        for (const [pattern, replacement] of rule.replace) {
          handler = handler.replace(new RegExp(pattern, 'g'), replacement);
        }
      }
      return formatAttribute('event', rule.to, handler, p.raw.quote);
    }
    let kind = p.kind as 'static' | 'property' | 'twoWay';
    let value = p.raw.value;
    if (kind === 'static') {
      if (rule.boolean) {
        if (value === 'false') {
          return undefined;
        }
        return formatAttribute('property', rule.to, 'true', p.raw.quote);
      }
      if (rule.values && value !== undefined) {
        const mapped = rule.values[value];
        if (mapped === undefined) {
          this.todo(`Valeur "${value}" de "${p.name}" sur <${el.name}> à vérifier pour <${target}>.`);
        } else {
          value = mapped;
        }
      }
      if (rule.asProperty && value !== undefined) {
        kind = 'property';
        if (!/^-?\d+(\.\d+)?$/.test(value) && !/^(true|false)$/.test(value)) {
          value = toQuotedLiteral(value, p.raw.quote);
        }
      }
    } else if (rule.values) {
      this.todo(
        `Valeurs de "${p.name}" sur <${el.name}> à adapter pour <${target}> (${Object.entries(rule.values)
          .map(([k, v]) => `${k} → ${v}`)
          .join(', ')}).`,
      );
    }
    if (kind === 'twoWay' && rule.oneWayOnly) {
      kind = 'property';
      this.todo(`Liaison bidirectionnelle "${p.name}" sur <${el.name}> convertie en liaison simple "[${rule.to}]".`);
    }
    return formatAttribute(kind, rule.to, value, p.raw.quote);
  }

  private attributeRule(mapping: ComponentMapping, name: string): AttributeRule | undefined {
    const key = camelCase(name);
    return normalizeRule(
      mapping.attributes?.[key] ??
        mapping.attributes?.[name] ??
        this.migration.commonAttributes?.[key] ??
        this.migration.commonAttributes?.[name],
    );
  }

  private eventRule(mapping: ComponentMapping, name: string): AttributeRule | undefined {
    return normalizeRule(mapping.events?.[name] ?? this.migration.commonEvents?.[name]);
  }
}

export function normalizeRule(rule: AttributeRuleInput | undefined): AttributeRule | undefined {
  if (rule === undefined) return undefined;
  return typeof rule === 'string' ? { to: rule } : rule;
}

export function normalizePrefix(prefix: string | undefined): string {
  return (prefix ?? '').trim().replace(/-+$/, '').toLowerCase();
}

/** Remplace le préfixe du design system sur une balise source. */
export function applyTagPrefix(tag: string, prefix: string | undefined, sourceTagPrefix: string): string {
  const normalized = normalizePrefix(prefix);
  if (!normalized || !tag.startsWith(sourceTagPrefix)) return tag;
  return `${normalized}-${tag.slice(sourceTagPrefix.length)}`;
}

function isGenericAttribute(name: string): boolean {
  return GENERIC_ATTRIBUTES.has(name) || /^(aria|data)-/.test(name);
}

function hasAttribute(attrs: string[], name: string): boolean {
  const re = new RegExp(`^\\s*(\\[\\(|\\[|\\()?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\)\\]|\\]|\\))?(=|$)`);
  return attrs.some((a) => re.test(a));
}

function findAttribute(el: ElementNode, name: string): ParsedAttribute | undefined {
  const key = camelCase(name);
  return el.attrs
    .map(parseAttribute)
    .find((p) => (p.kind === 'static' || p.kind === 'property' || p.kind === 'twoWay') && camelCase(p.name) === key);
}

function slotted(el: ElementNode, name: string): ElementNode[] {
  return elementChildren(el).filter((c) => c.attrs.some((a) => a.name === 'slot' && a.value === name));
}

/** `x = $event.target.modelValue` est-il une affectation de `expr` ? */
function isAssignmentOf(handler: string, expr: string): boolean {
  const match = /^\s*([^=]+?)\s*=(?!=)/.exec(handler);
  return !!match && match[1].replace(/\s+/g, '') === expr.replace(/\s+/g, '');
}

const INLINE_FORMATTING = new Set(['b', 'strong', 'i', 'em', 'span', 'small', 'abbr', 'code', 'br']);

function isInlineFormatting(el: ElementNode): boolean {
  return INLINE_FORMATTING.has(el.name.toLowerCase()) && elementChildren(el).every(isInlineFormatting);
}

function sanitizeComment(text: string): string {
  return normalizeWhitespace(text).replace(/--+>?/g, (m) => m.split('').join(' ')).replace(/<!/g, '< !');
}

/** Littéral de chaîne utilisable dans une expression délimitée par `quote`. */
export function toQuotedLiteral(value: string, quote: string = '"'): string {
  const q = quote === "'" ? '"' : "'";
  const escaped = value.replace(/\\/g, '\\\\').split(q).join(`\\${q}`);
  return `${q}${escaped}${q}`;
}

export function shorten(text: string, max = 120): string {
  const flat = normalizeWhitespace(text);
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Remplace l'attribut `slot="x"` d'un enfant déjà rendu par `replacement` (ou le supprime).
 */
function replaceFirstAttribute(
  rendered: string,
  originalRaw: string,
  slotAttr: { start: number; end: number; leading: string },
  replacement: string,
  source: string,
  child: ElementNode,
): string {
  const attrText = source.slice(slotAttr.start, slotAttr.end);
  const withLeading = slotAttr.leading + attrText;
  // L'enfant n'a pas été transformé : remplacement positionnel exact.
  if (rendered === originalRaw) {
    const offset = slotAttr.start - child.start - slotAttr.leading.length;
    return rendered.slice(0, offset) + (replacement ? ` ${replacement}` : '') + rendered.slice(offset + withLeading.length);
  }
  const index = rendered.indexOf(withLeading);
  if (index !== -1) {
    return rendered.slice(0, index) + (replacement ? ` ${replacement}` : '') + rendered.slice(index + withLeading.length);
  }
  return rendered;
}

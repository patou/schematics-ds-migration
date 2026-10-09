import { escapeAttributeValue } from '../../../core/html/attribute';
import { ElementNode, elementChildren, HtmlNode } from '../../../core/html/parser';
import { ComponentMapping } from '../../../core/types';
import { shorten, TransformContext } from '../../../core/template-migrator';
import { dsfr, eventValue, reindent, stripSlot } from '../shared';

interface Pair {
  head: ElementNode;
  body?: ElementNode;
  /** L'élément est-il dans un bloc de contrôle (@for, @if, ...) ? */
  inBlock: boolean;
}

const slotOf = (node: HtmlNode): string | undefined =>
  node.type === 'element' ? node.attrs.find((a) => a.name === 'slot')?.value : undefined;

/** Variation de profondeur des blocs de contrôle (`@for (...) {` / `}`) dans un texte. */
function blockDelta(text: string): number {
  const code = text.replace(/\{\{[\s\S]*?\}\}/g, '');
  return (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length;
}

/**
 * Parcourt les enfants dans l'ordre : chaque élément `headSlot` est associé à l'élément `bodySlot` qui le suit
 * et remplacé par `renderItem`. Le reste (texte, blocs @for / @if, commentaires) est conservé.
 */
function renderPairs(
  el: ElementNode,
  ctx: TransformContext,
  headSlot: string,
  bodySlot: string,
  target: string,
  renderItem: (pair: Pair) => string,
): string {
  const children = el.children;
  let out = '';
  let depth = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type !== 'element') {
      if (child.type === 'text') depth += blockDelta(child.value);
      out += ctx.raw(child);
      continue;
    }
    const slot = slotOf(child);
    if (child.attrs.some((a) => a.name.startsWith('*'))) {
      ctx.todo(`Directive structurelle sur un slot de <${el.name}> : utilisez un bloc @for englobant (${shorten(ctx.raw(child))}).`);
    }
    if (slot === headSlot) {
      let j = i + 1;
      while (j < children.length && children[j].type === 'text' && /^\s*$/.test((children[j] as { value: string }).value)) j++;
      const next = children[j];
      const body = next && slotOf(next) === bodySlot ? (next as ElementNode) : undefined;
      if (!body) ctx.todo(`Slot "${headSlot}" sans slot "${bodySlot}" associé dans <${el.name}> : ${shorten(ctx.raw(child))}`);
      out += renderItem({ head: child, body, inBlock: depth > 0 });
      if (body) i = j;
      continue;
    }
    if (slot === bodySlot) {
      ctx.todo(`Slot "${bodySlot}" sans slot "${headSlot}" associé dans <${el.name}> : ${shorten(ctx.raw(child))}`);
    } else {
      ctx.todo(`Contenu non supporté dans <${target}> : ${shorten(ctx.raw(child))}`);
    }
    out += ctx.render(child);
  }
  return out;
}

/** Libellé (texte) d'un élément d'en-tête ; signale le contenu riche. */
function headingText(head: ElementNode, ctx: TransformContext, attr: string): string {
  const rich = elementChildren(head).filter((c) => !/^(button|b|strong|i|em|span|small|abbr|code|br)$/i.test(c.name));
  if (rich.length) ctx.todo(`Contenu riche de l’en-tête converti en texte dans "${attr}" : ${shorten(ctx.raw(head))}`);
  return escapeAttributeValue(ctx.text(head));
}

/** Corps d'un onglet / accordéon : l'élément de slot est conservé (sans l'attribut slot). */
function body(pair: Pair, ctx: TransformContext, slot: string): string {
  if (!pair.body) return '';
  const indent = ctx.indent(pair.head);
  const html = stripSlot(ctx.render(pair.body), slot);
  return `\n${indent}  ${reindent(html, ctx.indent(pair.body), `${indent}  `)}\n${indent}`;
}

function tabs(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el);
  const content = renderPairs(el, ctx, 'tab', 'panel', 'dsfr-tabs', (pair) => {
    const id = ctx.uniqueId('tab');
    if (pair.inBlock) {
      ctx.todo(`Onglet généré dans un bloc de contrôle : rendez tabId unique (ex : tabId="${id}-{{ $index }}").`);
    }
    const tabAttrs = [` tabId="${id}"`, ` label="${headingText(pair.head, ctx, 'label')}"`];
    const disabled = ctx.attr(pair.head, 'disabled');
    if (disabled) tabAttrs.push(disabled.kind === 'static' ? ' [disabled]="true"' : ` [disabled]="${disabled.raw.value}"`);
    return ctx.buildElement('dsfr-tab', tabAttrs, body(pair, ctx, 'panel'));
  });
  ctx.addImport(dsfr('DsfrTabComponent'));
  return ctx.buildElement('dsfr-tabs', attrs, el.selfClosing ? undefined : content, el);
}

function headingLevel(head: ElementNode): string | undefined {
  const match = /^h([1-6])$/i.exec(head.name);
  return match ? `H${match[1]}` : undefined;
}

function accordionItem(pair: Pair, ctx: TransformContext, extra: string[] = []): string {
  const attrs = [` heading="${headingText(pair.head, ctx, 'heading')}"`];
  const level = headingLevel(pair.head);
  if (level) attrs.push(` headingLevel="${level}"`);
  attrs.push(...extra);
  return ctx.buildElement('dsfr-accordion', attrs, body(pair, ctx, 'content'));
}

function accordion(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el, undefined, { exclude: ['exclusive'] });
  if (!ctx.attr(el, 'exclusive')) attrs.push(' [ungroup]="true"');
  const content = renderPairs(el, ctx, 'invoker', 'content', 'dsfr-accordions-group', (pair) => accordionItem(pair, ctx));
  ctx.addImport(dsfr('DsfrAccordionComponent'));
  return ctx.buildElement('dsfr-accordions-group', attrs, el.selfClosing ? undefined : content, el);
}

function collapsible(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el);
  const heads = ctx.slotted(el, 'invoker');
  if (heads.length > 1) ctx.todo('Plusieurs invokers dans lion-collapsible : seul le premier est converti.');
  for (const other of elementChildren(el).filter((c) => slotOf(c) !== 'invoker' && slotOf(c) !== 'content')) {
    ctx.todo(`Contenu non supporté dans <dsfr-accordion> : ${shorten(ctx.raw(other))}`);
  }
  const head = heads[0];
  if (!head) return ctx.buildElement('dsfr-accordion', attrs, '', el);
  const content = ctx.slotted(el, 'content')[0];
  const html = accordionItem({ head, body: content, inBlock: false }, ctx, attrs);
  // L'élément remplace le collapsible : réaligne le corps sur l'indentation du collapsible.
  return reindent(html, ctx.indent(head), ctx.indent(el));
}

/** Incrément 6 : navigation et affichage. */
export const NAVIGATION_MAPPINGS: ComponentMapping[] = [
  {
    source: 'lion-tabs',
    target: 'dsfr-tabs',
    status: 'auto',
    description:
      'Onglets : chaque paire `slot="tab"` / `slot="panel"` devient un `<dsfr-tab tabId="tab-N" label="…">` contenant le panneau.',
    attributes: {
      selectedIndex: { to: 'selectedTabIndex', asProperty: true },
      vertical: { todo: 'Onglets verticaux non supportés par le DSFR.' },
    },
    events: {
      'selected-changed': { to: 'tabIndexSelect', replace: eventValue('selectedIndex') },
    },
    imports: [dsfr('DsfrTabsComponent')],
    transform: tabs,
    notes: ['Les identifiants `tabId` sont générés (`tab-1`, `tab-2`, ...) : renommez-les si besoin.'],
  },
  {
    source: 'lion-accordion',
    target: 'dsfr-accordions-group',
    status: 'auto',
    description:
      'Accordéon : chaque paire `slot="invoker"` / `slot="content"` devient un `<dsfr-accordion heading="…">` contenant le contenu.',
    attributes: {
      exclusive: { remove: true, doc: 'Sans `exclusive`, `[ungroup]="true"` est ajouté (plusieurs sections ouvertes).' },
      expanded: { todo: '`expanded` (sections ouvertes) : utilisez [(expanded)] sur chaque <dsfr-accordion>.' },
    },
    events: {
      'expanded-changed': { todo: 'Écoutez (expandedChange) sur chaque <dsfr-accordion>.' },
    },
    imports: [dsfr('DsfrAccordionsGroupComponent')],
    transform: accordion,
    notes: ['Le niveau de titre de l’invoker (`<h3 slot="invoker">`) devient `headingLevel="H3"`.'],
  },
  {
    source: 'lion-collapsible',
    target: 'dsfr-accordion',
    status: 'auto',
    description: 'Section repliable → accordéon DSFR isolé.',
    attributes: {
      opened: { to: 'expanded', boolean: true, twoWay: { event: 'opened-changed', to: 'expanded' } },
    },
    events: {
      'opened-changed': { to: 'expandedChange', replace: eventValue('opened') },
    },
    imports: [dsfr('DsfrAccordionComponent')],
    transform: collapsible,
  },
  {
    source: 'lion-pagination',
    target: 'dsfr-pagination',
    status: 'auto',
    description: 'Pagination.',
    attributes: {
      current: { to: 'currentPage', asProperty: true },
      count: { to: 'pageCount', asProperty: true },
    },
    events: {
      'current-changed': { to: 'pageSelect', replace: eventValue('current') },
    },
    imports: [dsfr('DsfrPaginationComponent')],
    notes: ['`(pageSelect)` émet directement le numéro de page sélectionné.'],
  },
  {
    source: 'lion-steps',
    target: null,
    status: 'manual',
    description: 'Parcours en étapes : `dsfr-stepper` n’affiche que l’indicateur d’étapes.',
    todo:
      'lion-steps : utilisez <dsfr-stepper [currentStep]="…" [totalSteps]="…" currentStepTitle="…" nextStepTitle="…"> et affichez le contenu de l’étape courante (@switch).',
  },
  {
    source: 'lion-step',
    target: null,
    status: 'manual',
    description: 'Étape (voir lion-steps).',
    todo: 'lion-step : voir la migration de lion-steps vers <dsfr-stepper>.',
  },
];

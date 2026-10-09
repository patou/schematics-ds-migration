import { escapeAttributeValue } from '../../../core/html/attribute';
import { ElementNode, elementChildren } from '../../../core/html/parser';
import { ComponentMapping } from '../../../core/types';
import { shorten, TransformContext } from '../../../core/template-migrator';
import { dsfr, eventValue, reindent, stripSlot } from '../shared';

interface Pair {
  head: ElementNode;
  body?: ElementNode;
}

/** Associe dans l'ordre les éléments des slots `headSlot` / `bodySlot` et signale le reste. */
function pairs(el: ElementNode, ctx: TransformContext, headSlot: string, bodySlot: string, target: string): Pair[] {
  const heads = ctx.slotted(el, headSlot);
  const bodies = ctx.slotted(el, bodySlot);
  if ([...heads, ...bodies].some((c) => c.attrs.some((a) => a.name.startsWith('*'))) || el.children.some((c) => c.type === 'text' && /@(for|if)\b/.test(c.value))) {
    ctx.todo(`Éléments générés dynamiquement dans <${el.name}> : vérifiez la conversion en <${target}>.`);
  }
  for (const other of elementChildren(el).filter((c) => !heads.includes(c) && !bodies.includes(c))) {
    ctx.todo(`Contenu non supporté dans <${target}> : ${shorten(ctx.raw(other))}`);
  }
  if (heads.length !== bodies.length) {
    ctx.todo(`<${el.name}> : ${heads.length} slot(s) "${headSlot}" pour ${bodies.length} slot(s) "${bodySlot}", vérifiez l’association.`);
  }
  return heads.map((head, i) => ({ head, body: bodies[i] }));
}

/** Indentation des enfants (celle du premier enfant élément, sinon parent + 2 espaces). */
function childIndent(el: ElementNode, ctx: TransformContext): string {
  const first = elementChildren(el)[0];
  const indent = first ? ctx.indent(first) : '';
  return indent.length > ctx.indent(el).length ? indent : `${ctx.indent(el)}  `;
}

/** Libellé (texte) d'un élément d'en-tête ; signale le contenu riche. */
function headingText(head: ElementNode, ctx: TransformContext, attr: string): string {
  const rich = elementChildren(head).filter((c) => !/^(button|b|strong|i|em|span|small|abbr|code|br)$/i.test(c.name));
  if (rich.length) ctx.todo(`Contenu riche de l’en-tête converti en texte dans "${attr}" : ${shorten(ctx.raw(head))}`);
  return escapeAttributeValue(ctx.text(head));
}

/** Corps d'un onglet / accordéon : l'élément de slot est conservé (sans l'attribut slot). */
function body(pair: Pair, ctx: TransformContext, slot: string, inner: string): string {
  if (!pair.body) return '';
  const html = stripSlot(ctx.render(pair.body), slot);
  return `\n${inner}  ${reindent(html, ctx.indent(pair.body), `${inner}  `)}\n${inner}`;
}

function tabs(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el);
  const inner = childIndent(el, ctx);
  let content = '';
  for (const pair of pairs(el, ctx, 'tab', 'panel', 'dsfr-tabs')) {
    const tabAttrs = [` tabId="${ctx.uniqueId('tab')}"`, ` label="${headingText(pair.head, ctx, 'label')}"`];
    const disabled = ctx.attr(pair.head, 'disabled');
    if (disabled) tabAttrs.push(disabled.kind === 'static' ? ' [disabled]="true"' : ` [disabled]="${disabled.raw.value}"`);
    content += `\n${inner}${ctx.buildElement('dsfr-tab', tabAttrs, body(pair, ctx, 'panel', inner))}`;
  }
  ctx.addImport(dsfr('DsfrTabComponent'));
  return ctx.buildElement('dsfr-tabs', attrs, content ? `${content}\n${ctx.indent(el)}` : '', el);
}

function headingLevel(head: ElementNode): string | undefined {
  const match = /^h([1-6])$/i.exec(head.name);
  return match ? `H${match[1]}` : undefined;
}

function accordionItem(pair: Pair, ctx: TransformContext, inner: string, extra: string[] = []): string {
  const attrs = [` heading="${headingText(pair.head, ctx, 'heading')}"`];
  const level = headingLevel(pair.head);
  if (level) attrs.push(` headingLevel="${level}"`);
  attrs.push(...extra);
  return ctx.buildElement('dsfr-accordion', attrs, body(pair, ctx, 'content', inner));
}

function accordion(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el, undefined, { exclude: ['exclusive'] });
  if (!ctx.attr(el, 'exclusive')) attrs.push(' [ungroup]="true"');
  const inner = childIndent(el, ctx);
  const items = pairs(el, ctx, 'invoker', 'content', 'dsfr-accordions-group').map(
    (pair) => `\n${inner}${accordionItem(pair, ctx, inner)}`,
  );
  ctx.addImport(dsfr('DsfrAccordionComponent'));
  return ctx.buildElement('dsfr-accordions-group', attrs, items.length ? `${items.join('')}\n${ctx.indent(el)}` : '', el);
}

function collapsible(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el);
  const [pair, ...rest] = pairs(el, ctx, 'invoker', 'content', 'dsfr-accordion');
  if (rest.length) ctx.todo('Plusieurs invokers dans lion-collapsible : seul le premier est converti.');
  if (!pair) return ctx.buildElement('dsfr-accordion', attrs, '', el);
  const html = accordionItem(pair, ctx, ctx.indent(el), attrs);
  return html;
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

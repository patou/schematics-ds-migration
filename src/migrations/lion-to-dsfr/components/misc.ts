import { escapeAttributeValue } from '../../../core/html/attribute';
import { ElementNode, elementChildren } from '../../../core/html/parser';
import { ComponentMapping } from '../../../core/types';
import { shorten, TransformContext } from '../../../core/template-migrator';
import { addToStartTag, dsfr, FIELD_ATTRIBUTES, reindent, stripSlot } from '../shared';
import { FIELD_SLOTS } from './inputs';

/** Invoker (slot="invoker") rendu sans l'attribut slot. */
function renderInvoker(el: ElementNode, ctx: TransformContext): { html: string; node?: ElementNode } {
  const [invoker, ...others] = ctx.slotted(el, 'invoker');
  if (others.length) ctx.todo(`Plusieurs invokers dans <${el.name}> : seul le premier est converti.`);
  if (!invoker) return { html: '' };
  return { html: stripSlot(ctx.render(invoker), 'invoker'), node: invoker };
}

function unsupportedChildren(el: ElementNode, ctx: TransformContext, target: string): void {
  for (const child of elementChildren(el)) {
    const slot = child.attrs.find((a) => a.name === 'slot')?.value;
    if (slot !== 'invoker' && slot !== 'content') ctx.todo(`Contenu non supporté pour <${target}> : ${shorten(ctx.raw(child))}`);
  }
}

/** lion-dialog -> invoker (aria-controls) + dsfr-modal. */
function dialog(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el);
  const id = ctx.uniqueId('dialog');
  unsupportedChildren(el, ctx, 'dsfr-modal');
  const invoker = renderInvoker(el, ctx);
  let invokerHtml = invoker.html;
  if (invokerHtml) {
    if (/^(?:\s*<!--(?:(?!-->)[\s\S])*-->)*\s*<dsfr-button\b/.test(invokerHtml)) {
      invokerHtml = addToStartTag(invokerHtml, ` ariaControls="${id}"`);
    } else {
      const hasClass = invoker.node?.attrs.some((a) => a.name === 'class' || a.name === '[class]' || a.name === '[ngClass]');
      invokerHtml = addToStartTag(invokerHtml, `${hasClass ? '' : ' class="fr-btn"'} aria-controls="${id}" data-fr-opened="false"`);
    }
  } else {
    ctx.todo(`Pas d’invoker : ouvrez la modale avec la méthode open() (référence #modal) ou un bouton aria-controls="${id}".`);
  }
  ctx.todo('Renseignez le titre de la modale (titleModal), obligatoire pour l’accessibilité.');
  const content = ctx.slotted(el, 'content');
  const indent = ctx.indent(el);
  const body = content
    .map((c) => `\n${indent}  ${reindent(stripSlot(ctx.render(c), 'content'), ctx.indent(c), `${indent}  `)}`)
    .join('');
  const modal = ctx.buildElement(
    'dsfr-modal',
    [` dialogId="${id}"`, ' titleModal=""', ...attrs],
    body ? `${body}\n${indent}` : '',
    el,
  );
  return invokerHtml ? `${invokerHtml}\n${indent}${modal}` : modal;
}

/** lion-tooltip -> invoker avec la directive [tooltip]. */
function tooltip(el: ElementNode, ctx: TransformContext): string {
  ctx.convertAttributes(el);
  unsupportedChildren(el, ctx, '[tooltip]');
  const invoker = renderInvoker(el, ctx);
  const content = ctx.slotted(el, 'content');
  const text = content.map((c) => ctx.text(c)).join(' ');
  if (content.some((c) => elementChildren(c).length)) {
    ctx.todo(`Contenu riche de l’infobulle converti en texte : ${shorten(content.map((c) => ctx.raw(c)).join(' '))}`);
  }
  if (!invoker.html) {
    ctx.todo('lion-tooltip sans invoker : utilisez <dsfr-tooltip-button tooltip="…">.');
    return ctx.raw(el);
  }
  return addToStartTag(invoker.html, ` tooltip="${escapeAttributeValue(text)}"`);
}

const manual = (source: string, description: string, todo: string): ComponentMapping => ({
  source,
  target: null,
  status: 'manual',
  description,
  todo,
});

/** Incrément 7 : composants divers. */
export const MISC_MAPPINGS: ComponentMapping[] = [
  {
    source: 'lion-dialog',
    target: 'dsfr-modal',
    status: 'partial',
    description:
      'Fenêtre modale : l’invoker devient un bouton `aria-controls="dialog-N"`, le contenu est placé dans `<dsfr-modal dialogId="dialog-N">`.',
    attributes: {
      config: { todo: 'La configuration de lion-dialog ([config]) n’a pas d’équivalent : voir size, concealingBackdrop, mobileTop.' },
      opened: { todo: '`opened` : ouvrez la modale avec la méthode open() du composant <dsfr-modal>.' },
    },
    events: {
      'opened-changed': { todo: '`opened-changed` : utilisez les événements (disclose) / (conceal) de <dsfr-modal>.' },
    },
    imports: [dsfr('DsfrModalComponent')],
    transform: dialog,
    notes: [
      'Le titre `titleModal` doit être renseigné manuellement.',
      'Les boutons de fermeture du contenu peuvent être remplacés par l’input `actions` de `dsfr-modal`.',
    ],
  },
  {
    source: 'lion-tooltip',
    target: '[tooltip]',
    status: 'auto',
    description: 'Infobulle : l’invoker reçoit la directive `tooltip="…"` avec le texte du contenu.',
    attributes: {
      hasArrow: { remove: true, doc: 'Supprimé (flèche native DSFR).' },
      invokerRelation: { remove: true, doc: 'Supprimé (géré par la directive).' },
      config: { todo: 'La configuration de lion-tooltip ([config]) n’a pas d’équivalent.' },
    },
    imports: [dsfr('DsfrTooltipDirective')],
    transform: tooltip,
  },
  {
    source: 'lion-input-range',
    target: 'dsfr-range',
    status: 'auto',
    description: 'Curseur.',
    attributes: {
      ...FIELD_ATTRIBUTES,
      min: { to: 'min', asProperty: true },
      max: { to: 'max', asProperty: true },
      step: { to: 'step', asProperty: true },
      unit: { to: 'suffix', doc: 'Unité affichée après la valeur.' },
      noMinMaxLabels: { to: 'hideMinMax', boolean: true },
      labelSrOnly: { todo: '`label-sr-only` n’est pas supporté par <dsfr-range>.' },
    },
    slots: FIELD_SLOTS,
    imports: [dsfr('DsfrRangeComponent')],
  },
  {
    source: 'lion-input-file',
    target: 'dsfr-upload',
    status: 'partial',
    description: 'Envoi de fichier.',
    attributes: {
      ...FIELD_ATTRIBUTES,
      accept: 'accept',
      multiple: { to: 'multiple', boolean: true },
      buttonLabel: { todo: '`button-label` : le libellé du bouton est fourni par le navigateur.' },
      maxFileSize: { todo: '`max-file-size` : validez la taille des fichiers dans (fileSelect).' },
      enableDropZone: { todo: '`enable-drop-zone` : zone de dépôt non supportée par <dsfr-upload>.' },
      uploadOnSelect: { todo: '`upload-on-select` : déclenchez l’envoi dans (fileSelect).' },
    },
    events: {
      'file-list-changed': {
        to: 'fileSelect',
        todo: '(file-list-changed) → (fileSelect) : $event est désormais la liste des fichiers sélectionnés.',
      },
    },
    slots: { ...FIELD_SLOTS, 'file-select-button': { todo: 'Bouton de sélection personnalisé non supporté.' } },
    imports: [dsfr('DsfrUploadComponent')],
  },
  manual(
    'lion-progress-indicator',
    'Indicateur de progression : pas de composant ngx-dsfr.',
    'lion-progress-indicator : pas d’équivalent ngx-dsfr, utilisez l’élément natif <progress> ou [loader]="true" sur <dsfr-button>.',
  ),
  manual(
    'lion-icon',
    'Icône : le DSFR utilise des classes CSS (`fr-icon-*`).',
    'lion-icon : utilisez une icône DSFR (<span class="fr-icon-xxx" aria-hidden="true"></span>) ou l’input `icon` des composants.',
  ),
  manual(
    'lion-drawer',
    'Panneau latéral repliable : pas d’équivalent DSFR.',
    'lion-drawer : pas d’équivalent DSFR (envisagez <dsfr-sidemenu> ou <dsfr-accordion>).',
  ),
  manual(
    'lion-validation-feedback',
    'Messages de validation : gérés par les inputs `error` / `message` des champs ngx-dsfr.',
    'lion-validation-feedback : utilisez les inputs error / message / messageSeverity du champ ngx-dsfr.',
  ),
  manual(
    'lion-field',
    'Champ générique (classe de base) : pas d’équivalent direct.',
    'lion-field : remplacez par le champ ngx-dsfr adapté (<dsfr-form-input>, <dsfr-form-select>, ...).',
  ),
  manual(
    'lion-select-invoker',
    'Bouton interne de lion-select-rich.',
    'lion-select-invoker : élément interne de lion-select-rich, à supprimer (voir <dsfr-form-select>).',
  ),
  manual(
    'lion-selected-file-list',
    'Liste des fichiers sélectionnés (interne à lion-input-file).',
    'lion-selected-file-list : affichez la liste des fichiers reçus via (fileSelect) de <dsfr-upload>.',
  ),
];

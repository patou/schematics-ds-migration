import { ElementNode } from '../../../core/html/parser';
import { ComponentMapping } from '../../../core/types';
import { TransformContext } from '../../../core/template-migrator';
import { asFieldsetElement, dedent, dsfr, renderGroup } from '../shared';

/** Rendu d'un enfant de fieldset : les champs DSFR reçoivent la directive `dsfrFieldsetElement`. */
export function fieldsetChild(ctx: TransformContext) {
  return (child: ElementNode): string => {
    const html = ctx.render(child);
    return /^(?:\s*<!--(?:(?!-->)[\s\S])*-->)*\s*<dsfr-form-/.test(html) ? asFieldsetElement(html, ctx) : html;
  };
}

function fieldset(el: ElementNode, ctx: TransformContext): string {
  return renderGroup(el, ctx, {
    target: 'dsfr-form-fieldset',
    attrs: ctx.convertAttributes(el),
    slots: { label: 'legend', 'help-text': 'hint' },
    renderChild: fieldsetChild(ctx),
  });
}

/** lion-form : le <form> natif interne est conservé, l'enveloppe Lion est supprimée. */
function form(el: ElementNode, ctx: TransformContext): string {
  const attrs = el.attrs.map((a) => a.name + (a.value !== undefined ? `="${a.value}"` : ''));
  if (attrs.length) {
    ctx.todo(`Attributs de <${el.name}> supprimés, à reporter sur le <form> si nécessaire : ${attrs.join(' ')}`);
  }
  const content = ctx.renderChildren(el);
  const firstIndent = /\n([ \t]*)\S/.exec(content)?.[1] ?? '';
  const delta = firstIndent.length - ctx.indent(el).length;
  return dedent(content, delta).replace(/^\s+/, '').replace(/\s+$/, '');
}

/** Incrément 5 : structure des formulaires. */
export const STRUCTURE_MAPPINGS: ComponentMapping[] = [
  {
    source: 'lion-fieldset',
    target: 'dsfr-form-fieldset',
    status: 'auto',
    description: 'Groupe de champs → `dsfr-form-fieldset` ; les champs enfants reçoivent la directive `dsfrFieldsetElement`.',
    attributes: {
      label: { to: 'legend', doc: 'Légende du groupe.' },
      helpText: { to: 'hint' },
      disabled: { to: 'disabled', boolean: true },
      labelSrOnly: { to: 'legendSrOnly', boolean: true },
      name: {
        todo: '`name` de lion-fieldset (regroupement des valeurs) : utilisez `formGroupName` ou `ngModelGroup`.',
      },
      modelValue: {
        todo: 'La valeur agrégée de lion-fieldset n’existe pas en DSFR : utilisez un FormGroup (`formGroupName`).',
      },
    },
    events: {
      'model-value-changed': { todo: 'Événement de lion-fieldset : écoutez `valueChanges` du FormGroup Angular.' },
    },
    imports: [dsfr('DsfrFormFieldsetComponent')],
    transform: fieldset,
  },
  {
    source: 'lion-form',
    target: 'form',
    status: 'partial',
    description: 'Enveloppe de formulaire supprimée : le `<form>` natif est conservé.',
    transform: form,
    todo: 'lion-form supprimé : gérez la soumission avec (ngSubmit) et la validation avec Angular Forms.',
    notes: ['L’élément `<lion-form>` est retiré, son `<form>` enfant est conservé tel quel (indentation réajustée).'],
  },
];

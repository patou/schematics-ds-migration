import { ElementNode, elementChildren } from '../../../core/html/parser';
import { ComponentMapping } from '../../../core/types';
import { TransformContext } from '../../../core/template-migrator';
import { attrExpression, asFieldsetElement, dsfr, eventValue, FIELD_ATTRIBUTES, renderGroup } from '../shared';
import { FIELD_SLOTS } from './inputs';

const CHECKED_DOC = 'Valeur initiale : la case est cochée si la valeur du modèle (ngModel / FormControl) est `true`.';

const CHECKBOX: ComponentMapping = {
  source: 'lion-checkbox',
  target: 'dsfr-form-checkbox',
  status: 'auto',
  description: 'Case à cocher.',
  attributes: {
    ...FIELD_ATTRIBUTES,
    checked: { to: 'value', boolean: true, doc: CHECKED_DOC },
    choiceValue: {
      todo: '`choiceValue` : <dsfr-form-checkbox> a une valeur booléenne (cochée / non cochée), adaptez le modèle.',
    },
    slot: { remove: true, doc: 'Supprimé (case d’une lion-checkbox-indeterminate).' },
  },
  events: {
    'checked-changed': { to: 'ngModelChange', replace: eventValue('checked') },
  },
  slots: FIELD_SLOTS,
  imports: [dsfr('DsfrFormCheckboxComponent')],
  notes: ['La valeur du modèle est un booléen. Utilisez `[(ngModel)]` ou `formControlName`.'],
};

/** lion-checkbox-group -> dsfr-form-fieldset contenant des dsfr-form-checkbox. */
function checkboxGroup(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el);
  return renderGroup(el, ctx, {
    target: 'dsfr-form-fieldset',
    attrs,
    slots: { label: 'legend', 'help-text': 'hint' },
    renderChild: (child) => asFieldsetElement(ctx.render(child), ctx),
  });
}

const GROUP_ATTRIBUTES = {
  label: { to: 'legend', doc: 'Légende du groupe.' },
  helpText: { to: 'hint' },
  disabled: { to: 'disabled', boolean: true },
  labelSrOnly: { to: 'legendSrOnly', boolean: true },
};

const CHECKBOX_GROUP: ComponentMapping = {
  source: 'lion-checkbox-group',
  target: 'dsfr-form-fieldset',
  status: 'partial',
  description: 'Groupe de cases à cocher → fieldset DSFR contenant des cases (directive `dsfrFieldsetElement`).',
  attributes: {
    ...GROUP_ATTRIBUTES,
    name: { todo: '`name` du groupe : renseignez `name` sur chaque <dsfr-form-checkbox>.' },
    modelValue: {
      todo: 'La valeur du groupe (tableau des cases cochées) n’existe pas en DSFR : liez chaque <dsfr-form-checkbox> à un booléen.',
    },
  },
  events: {
    'model-value-changed': {
      todo: 'Événement du groupe : écoutez (ngModelChange) sur chaque <dsfr-form-checkbox>.',
    },
  },
  imports: [dsfr('DsfrFormFieldsetComponent')],
  transform: checkboxGroup,
  notes: ['Chaque case est un champ indépendant à valeur booléenne.'],
};

/** lion-checkbox-indeterminate -> dsfr-form-checkbox [indeterminate] suivie des cases enfants. */
function checkboxIndeterminate(el: ElementNode, ctx: TransformContext): string {
  ctx.todo(
    'L’état indéterminé est calculé automatiquement par Lion : liez [indeterminate] et gérez la sélection des cases enfants.',
  );
  const attrs = ctx.convertAttributes(el, CHECKBOX);
  const children = el.children.filter((c) => !(c.type === 'element' && c.attrs.some((a) => a.name === 'slot' && a.value !== 'checkbox')));
  const labelSlot = elementChildren(el).find((c) => c.attrs.some((a) => a.name === 'slot' && a.value === 'label'));
  if (labelSlot && !attrs.some((a) => /^\s*\[?label\]?=/.test(a))) attrs.push(` label="${ctx.text(labelSlot)}"`);
  attrs.push(' [indeterminate]="false"');
  const parent = ctx.buildElement('dsfr-form-checkbox', attrs, el.selfClosing ? undefined : '', el);
  const nested = children
    .map((c) => ctx.render(c))
    .join('')
    .replace(/\s+$/, '');
  return nested.trim() ? `${parent}${nested.replace(/^\s*\n/, '\n')}` : parent;
}

const CHECKBOX_INDETERMINATE: ComponentMapping = {
  source: 'lion-checkbox-indeterminate',
  target: 'dsfr-form-checkbox',
  status: 'partial',
  description: 'Case à cocher parente (état indéterminé) → case `[indeterminate]` suivie des cases enfants.',
  attributes: CHECKBOX.attributes,
  imports: [dsfr('DsfrFormCheckboxComponent')],
  transform: checkboxIndeterminate,
};

/** lion-radio-group + lion-radio -> dsfr-form-radio [options]. */
function radioGroup(el: ElementNode, ctx: TransformContext): string {
  const attrs = ctx.convertAttributes(el);
  const options: string[] = [];
  const rest: ElementNode[] = [];

  for (const child of elementChildren(el)) {
    const slot = child.attrs.find((a) => a.name === 'slot')?.value;
    if (slot === 'label' || slot === 'help-text') {
      const attrName = slot === 'label' ? 'label' : 'hint';
      if (!attrs.some((a) => new RegExp(`^\\s*\\[?${attrName}\\]?=`).test(a))) attrs.push(` ${attrName}="${ctx.text(child)}"`);
      continue;
    }
    if (!ctx.is(child, 'lion-radio')) {
      rest.push(child);
      continue;
    }
    if (child.attrs.some((a) => a.name.startsWith('*'))) {
      ctx.todo(
        `Option générée dynamiquement (${shortAttr(child)}) : construisez le tableau [options] dans le composant.`,
      );
      continue;
    }
    const labelSlot = elementChildren(child).find((c) => c.attrs.some((a) => a.name === 'slot' && a.value === 'label'));
    const label = attrExpression(ctx.attr(child, 'label')) ?? (labelSlot ? attrExpression({ kind: 'static', name: 'label', raw: { ...labelSlot.attrs[0], value: ctx.text(labelSlot) } }) : undefined);
    let value = attrExpression(ctx.attr(child, 'choiceValue')) ?? attrExpression(ctx.attr(child, 'modelValue'));
    if (value === undefined) {
      ctx.todo(`Option sans choiceValue (${shortAttr(child)}) : valeur à définir.`);
      value = label ?? "''";
    }
    const parts = [`label: ${label ?? "''"}`, `value: ${value}`];
    const hint = attrExpression(ctx.attr(child, 'helpText'));
    if (hint) parts.push(`hint: ${hint}`);
    const disabled = ctx.attr(child, 'disabled');
    if (disabled && !(disabled.kind === 'static' && disabled.raw.value === 'false')) {
      parts.push(`disabled: ${disabled.kind === 'static' ? 'true' : disabled.raw.value?.trim()}`);
    }
    if (ctx.attr(child, 'checked')) {
      ctx.todo(`Option cochée par défaut (${shortAttr(child)}) : initialisez la valeur du modèle à ${value}.`);
    }
    options.push(`{ ${parts.join(', ')} }`);
  }

  for (const other of rest) {
    ctx.todo(`Contenu non supporté dans <dsfr-form-radio> : ${ctx.raw(other).replace(/\s+/g, ' ').slice(0, 100)}`);
  }
  attrs.push(` [options]="[${options.join(', ')}]"`);
  return ctx.buildElement('dsfr-form-radio', attrs, el.selfClosing ? undefined : '', el);
}

function shortAttr(el: ElementNode): string {
  const label = el.attrs.find((a) => /label/i.test(a.name));
  return label ? `${label.name}="${label.value}"` : `<${el.name}>`;
}

const RADIO_GROUP: ComponentMapping = {
  source: 'lion-radio-group',
  target: 'dsfr-form-radio',
  status: 'auto',
  description: 'Groupe de boutons radio → `dsfr-form-radio` avec `[options]` généré à partir des `lion-radio`.',
  attributes: {
    ...FIELD_ATTRIBUTES,
    labelSrOnly: { to: 'legendSrOnly', boolean: true },
    required: { to: 'required', boolean: true },
  },
  imports: [dsfr('DsfrFormRadioComponent')],
  transform: radioGroup,
  notes: [
    'Chaque `<lion-radio label="…" choice-value="…">` devient une entrée `{ label, value }` de `[options]`.',
    'Les options générées par `*ngFor` / `@for` doivent être construites dans le composant.',
  ],
};

const RADIO: ComponentMapping = {
  source: 'lion-radio',
  target: null,
  status: 'manual',
  description: 'Bouton radio isolé (hors lion-radio-group).',
  todo: 'lion-radio hors d’un lion-radio-group : utilisez <dsfr-form-radio [options]="…">.',
};

const SWITCH: ComponentMapping = {
  source: 'lion-switch',
  target: 'dsfr-form-toggle',
  status: 'auto',
  description: 'Interrupteur.',
  attributes: {
    ...FIELD_ATTRIBUTES,
    checked: { to: 'value', boolean: true, doc: CHECKED_DOC },
  },
  events: {
    'checked-changed': { to: 'ngModelChange', replace: eventValue('checked') },
  },
  slots: FIELD_SLOTS,
  imports: [dsfr('DsfrFormToggleComponent')],
  notes: ['La valeur du modèle est un booléen.'],
};

/** Incrément 3 : cases à cocher, radios, interrupteurs. */
export const CHOICE_MAPPINGS: ComponentMapping[] = [
  CHECKBOX,
  CHECKBOX_GROUP,
  CHECKBOX_INDETERMINATE,
  RADIO_GROUP,
  RADIO,
  SWITCH,
];

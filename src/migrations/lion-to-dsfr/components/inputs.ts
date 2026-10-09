import { AttributeRuleInput, ComponentMapping, SlotRule } from '../../../core/types';
import { dsfr, INPUT_ATTRIBUTES } from '../shared';

/** Slots communs des champs Lion (FormControlMixin / FieldMixin). */
export const FIELD_SLOTS: Record<string, SlotRule> = {
  label: { toAttribute: 'label', doc: 'Le texte du slot devient l’input `label`.' },
  'help-text': { toAttribute: 'hint', doc: 'Le texte du slot devient l’input `hint`.' },
  feedback: { todo: 'Message de validation : utilisez les inputs error / message de ngx-dsfr.' },
};

const INPUT_SLOTS: Record<string, SlotRule> = {
  ...FIELD_SLOTS,
  prefix: { todo: 'Préfixe du champ non supporté par ngx-dsfr (utilisez `icon` ou le libellé).' },
  suffix: { todo: 'Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé).' },
  before: { todo: 'Slot "before" non supporté par ngx-dsfr.' },
  after: { todo: 'Slot "after" non supporté par ngx-dsfr.' },
  input: { todo: 'Élément <input> personnalisé non supporté : ngx-dsfr génère son propre champ.' },
};

const INPUT_TYPES = ['date', 'datetime-local', 'email', 'number', 'password', 'search', 'tel', 'text', 'time'];

const TEXT_INPUT_ATTRIBUTES: Record<string, AttributeRuleInput> = {
  ...INPUT_ATTRIBUTES,
  type: { to: 'type', values: Object.fromEntries(INPUT_TYPES.map((t) => [t, t])) },
};

const NOTES = [
  'ngx-dsfr implémente `ControlValueAccessor` : utilisez `[(ngModel)]`, `formControlName` ou `[formControl]`.',
  'Les messages d’erreur se passent via les inputs `error`, `valid`, `message` / `messageSeverity`.',
];

const input = (mapping: Partial<ComponentMapping> & Pick<ComponentMapping, 'source' | 'target'>): ComponentMapping => ({
  status: 'auto',
  attributes: TEXT_INPUT_ATTRIBUTES,
  slots: INPUT_SLOTS,
  imports: [dsfr('DsfrFormInputComponent')],
  notes: NOTES,
  ...mapping,
});

/** Incrément 2 : champs texte. */
export const INPUT_MAPPINGS: ComponentMapping[] = [
  input({ source: 'lion-input', target: 'dsfr-form-input', description: 'Champ de saisie texte.' }),
  input({
    source: 'lion-textarea',
    target: 'dsfr-form-input',
    description: 'Zone de texte multi-lignes.',
    attributes: {
      ...INPUT_ATTRIBUTES,
      rows: { to: 'rows', asProperty: true },
      maxRows: { todo: '`max-rows` (agrandissement automatique) n’existe pas dans ngx-dsfr.' },
    },
    addAttributes: { type: 'textarea' },
  }),
  input({
    source: 'lion-input-email',
    target: 'dsfr-form-email',
    description: 'Champ e-mail (validation du format incluse dans ngx-dsfr).',
    attributes: INPUT_ATTRIBUTES,
    imports: [dsfr('DsfrFormEmailComponent')],
  }),
  input({
    source: 'lion-input-tel',
    target: 'dsfr-form-tel',
    status: 'partial',
    description: 'Champ téléphone.',
    attributes: {
      ...INPUT_ATTRIBUTES,
      allowedRegions: { todo: 'Régions téléphoniques (`allowed-regions`) non supportées par ngx-dsfr.' },
      preferredRegions: { todo: 'Régions téléphoniques (`preferred-regions`) non supportées par ngx-dsfr.' },
      activeRegion: { todo: 'Région téléphonique (`active-region`) non supportée par ngx-dsfr.' },
      formatStrategy: { todo: 'Le formatage du numéro (`format-strategy`) n’existe pas dans ngx-dsfr.' },
      formatCountryCodeStyle: { todo: 'Le formatage du numéro (`format-country-code-style`) n’existe pas dans ngx-dsfr.' },
    },
    imports: [dsfr('DsfrFormTelComponent')],
  }),
  input({
    source: 'lion-input-tel-dropdown',
    target: 'dsfr-form-tel',
    status: 'partial',
    description: 'Champ téléphone avec choix du pays.',
    attributes: INPUT_ATTRIBUTES,
    imports: [dsfr('DsfrFormTelComponent')],
    todo: 'Le choix du pays (dropdown) n’existe pas dans ngx-dsfr : ajoutez un <dsfr-form-select> séparé si nécessaire.',
  }),
  input({
    source: 'lion-input-iban',
    target: 'dsfr-form-input',
    status: 'partial',
    description: 'Champ IBAN.',
    attributes: INPUT_ATTRIBUTES,
    todo: 'Validation et formatage IBAN de Lion à recréer (validateur Angular, ex : pattern).',
  }),
  input({
    source: 'lion-input-amount',
    target: 'dsfr-form-input',
    status: 'partial',
    description: 'Champ montant.',
    attributes: {
      ...INPUT_ATTRIBUTES,
      currency: { todo: 'La devise (`currency`) n’est pas gérée par ngx-dsfr : indiquez-la dans le libellé.' },
      locale: { todo: 'Le formatage localisé des montants n’existe pas dans ngx-dsfr.' },
    },
    addAttributes: { type: 'number' },
  }),
  input({
    source: 'lion-input-amount-dropdown',
    target: 'dsfr-form-input',
    status: 'partial',
    description: 'Champ montant avec choix de la devise.',
    attributes: INPUT_ATTRIBUTES,
    addAttributes: { type: 'number' },
    todo: 'Le choix de la devise (dropdown) n’existe pas dans ngx-dsfr : ajoutez un <dsfr-form-select> séparé si nécessaire.',
  }),
  input({
    source: 'lion-input-stepper',
    target: 'dsfr-form-input',
    status: 'partial',
    description: 'Champ numérique avec boutons +/-.',
    attributes: {
      ...INPUT_ATTRIBUTES,
      min: 'min',
      max: 'max',
      step: { todo: '`step` n’est pas supporté par <dsfr-form-input>.' },
      valueTextMapping: { todo: '`valueTextMapping` n’existe pas dans ngx-dsfr.' },
    },
    addAttributes: { type: 'number' },
    todo: 'Les boutons +/- de lion-input-stepper n’existent pas dans ngx-dsfr (champ numérique simple).',
  }),
];

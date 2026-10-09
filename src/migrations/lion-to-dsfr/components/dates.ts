import { ComponentMapping } from '../../../core/types';
import { dsfr, INPUT_ATTRIBUTES } from '../shared';
import { FIELD_SLOTS } from './inputs';

const DATE_TODO =
  'La valeur de <dsfr-form-input type="date"> est une chaîne "AAAA-MM-JJ" (objet Date en Lion) : adaptez le modèle et les validateurs (MinDate, MaxDate, ...). Alternative : <dsfr-date>.';

const DATE_ATTRIBUTES = {
  ...INPUT_ATTRIBUTES,
  min: 'min',
  max: 'max',
};

/** Incrément 5 : dates. */
export const DATE_MAPPINGS: ComponentMapping[] = [
  {
    source: 'lion-input-date',
    target: 'dsfr-form-input',
    status: 'partial',
    description: 'Champ date → champ natif `type="date"`.',
    attributes: DATE_ATTRIBUTES,
    slots: FIELD_SLOTS,
    addAttributes: { type: 'date' },
    imports: [dsfr('DsfrFormInputComponent')],
    todo: DATE_TODO,
  },
  {
    source: 'lion-input-datepicker',
    target: 'dsfr-form-input',
    status: 'partial',
    description: 'Champ date avec calendrier → champ natif `type="date"` (calendrier du navigateur).',
    attributes: {
      ...DATE_ATTRIBUTES,
      calendarHeading: { remove: true, doc: 'Supprimé (calendrier natif).' },
    },
    slots: FIELD_SLOTS,
    addAttributes: { type: 'date' },
    imports: [dsfr('DsfrFormInputComponent')],
    todo: DATE_TODO,
  },
  {
    source: 'lion-calendar',
    target: null,
    status: 'manual',
    description: 'Calendrier autonome : pas d’équivalent dans ngx-dsfr.',
    todo: 'lion-calendar n’a pas d’équivalent dans ngx-dsfr : utilisez <dsfr-form-input type="date"> ou <dsfr-date>.',
  },
];

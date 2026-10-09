import { MigrationDefinition } from '../../core/types';
import { dsfrDesignSystem } from '../../design-systems/dsfr';
import { lionDesignSystem } from '../../design-systems/lion';
import { BUTTON_MAPPINGS } from './components/buttons';
import { INPUT_MAPPINGS } from './components/inputs';
import { CHOICE_MAPPINGS } from './components/choices';
import { SELECT_MAPPINGS } from './components/selects';
import { FORMS_MODULE, VALIDATORS_TODO } from './shared';

/**
 * Migration Lion (@lion/ui) -> DSFR (@edugouvfr/ngx-dsfr).
 *
 * Les composants sont ajoutés de manière incrémentale (un fichier par famille dans `components/`).
 */
export const lionToDsfr: MigrationDefinition = {
  id: 'lion-to-dsfr',
  from: lionDesignSystem,
  to: dsfrDesignSystem,
  components: [...BUTTON_MAPPINGS, ...INPUT_MAPPINGS, ...CHOICE_MAPPINGS, ...SELECT_MAPPINGS],
  commonAttributes: {
    ngDefaultControl: {
      remove: true,
      doc: 'Inutile : les composants ngx-dsfr implémentent ControlValueAccessor.',
    },
    modelValue: {
      to: 'ngModel',
      twoWay: { event: 'model-value-changed', to: 'ngModel' },
      imports: [FORMS_MODULE],
      doc: '`[modelValue]` + `(model-value-changed)="x = $event.target.modelValue"` deviennent `[(ngModel)]="x"`.',
    },
    validators: { todo: VALIDATORS_TODO },
    serializedValue: { todo: '`serializedValue` n’existe pas dans ngx-dsfr : utilisez ngModel / FormControl.' },
    formattedValue: { todo: '`formattedValue` n’existe pas dans ngx-dsfr : utilisez ngModel / FormControl.' },
  },
  commonEvents: {
    'model-value-changed': {
      to: 'ngModelChange',
      imports: [FORMS_MODULE],
      replace: [['\\$event\\.(target|detail)\\.modelValue', '$$event']],
      doc: '`$event.target.modelValue` devient `$event`.',
    },
    'user-input-changed': {
      to: 'ngModelChange',
      imports: [FORMS_MODULE],
      replace: [['\\$event\\.(target|detail)\\.modelValue', '$$event']],
      doc: '`$event.target.modelValue` devient `$event`.',
    },
  },
  sourceDefineImport: (tag) => new RegExp(`^@lion/ui/define/${tag}(\\.js)?$`),
};

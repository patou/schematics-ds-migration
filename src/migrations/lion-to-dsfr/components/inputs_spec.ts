import { describe, expect, it } from 'vitest';
import { lion, todosOf, toDsfr } from '../../../testing/helpers';

describe('Lion -> DSFR : champs texte', () => {
  it('lion-input -> dsfr-form-input', () => {
    expect(
      toDsfr('<lion-input label="Nom" help-text="Votre nom" name="lastName" placeholder="Dupont" required></lion-input>'),
    ).toBe(
      '<dsfr-form-input label="Nom" hint="Votre nom" name="lastName" placeholder="Dupont" [required]="true"></dsfr-form-input>',
    );
    expect(lion('<lion-input></lion-input>').imports).toEqual([
      { name: 'DsfrFormInputComponent', from: '@edugouvfr/ngx-dsfr' },
    ]);
  });

  it('convertit les attributs liés et booléens', () => {
    expect(
      toDsfr('<lion-input [label]="l" [helpText]="h" readonly label-sr-only [disabled]="d" maxlength="10"></lion-input>'),
    ).toBe(
      '<dsfr-form-input [label]="l" [hint]="h" [readonly]="true" [labelSrOnly]="true" [disabled]="d" [maxLength]="10"></dsfr-form-input>',
    );
  });

  it('convertit le type et signale les types non supportés', () => {
    expect(toDsfr('<lion-input type="password"></lion-input>')).toBe('<dsfr-form-input type="password"></dsfr-form-input>');
    expect(todosOf('<lion-input type="url"></lion-input>')).toEqual([
      'Valeur "url" de "type" sur <lion-input> à vérifier pour <dsfr-form-input>.',
    ]);
  });

  it('[modelValue] + (model-value-changed) -> [(ngModel)]', () => {
    const result = lion(
      '<lion-input label="Nom" [modelValue]="user.name" (model-value-changed)="user.name = $event.target.modelValue"></lion-input>',
    );
    expect(result.content).toBe('<dsfr-form-input [(ngModel)]="user.name" label="Nom"></dsfr-form-input>');
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrFormInputComponent', 'FormsModule']);
  });

  it('[modelValue] seul -> [ngModel], (model-value-changed) -> (ngModelChange)', () => {
    expect(toDsfr('<lion-input [modelValue]="v" (model-value-changed)="onChange($event.target.modelValue)"></lion-input>')).toBe(
      '<dsfr-form-input [ngModel]="v" (ngModelChange)="onChange($event)"></dsfr-form-input>',
    );
  });

  it('conserve formControlName / ngModel et supprime ngDefaultControl', () => {
    expect(toDsfr('<lion-input formControlName="email" ngDefaultControl label="E-mail"></lion-input>')).toBe(
      '<dsfr-form-input formControlName="email" label="E-mail"></dsfr-form-input>',
    );
  });

  it('convertit les slots label / help-text et signale prefix/suffix', () => {
    const result = lion(
      ['<lion-input name="price">', '  <label slot="label">Prix</label>', '  <span slot="suffix">€</span>', '</lion-input>'].join(
        '\n',
      ),
    );
    expect(result.content).toBe(
      [
        '<!-- TODO(ds-migration): Suffixe du champ non supporté par ngx-dsfr (utilisez `icon`, `buttonLabel` ou le libellé). (<span slot="suffix">€</span>) -->',
        '<dsfr-form-input name="price" label="Prix"></dsfr-form-input>',
      ].join('\n'),
    );
  });

  it('signale les validateurs Lion', () => {
    expect(todosOf('<lion-input [validators]="[required]"></lion-input>')[0]).toContain('Validators Angular');
  });

  it('lion-textarea -> dsfr-form-input type="textarea"', () => {
    expect(toDsfr('<lion-textarea label="Message" rows="4"></lion-textarea>')).toBe(
      '<dsfr-form-input label="Message" [rows]="4" type="textarea"></dsfr-form-input>',
    );
    expect(todosOf('<lion-textarea max-rows="8"></lion-textarea>')).toHaveLength(1);
  });

  it('lion-input-email -> dsfr-form-email', () => {
    const result = lion('<lion-input-email label="E-mail" name="email"></lion-input-email>');
    expect(result.content).toBe('<dsfr-form-email label="E-mail" name="email"></dsfr-form-email>');
    expect(result.imports).toEqual([{ name: 'DsfrFormEmailComponent', from: '@edugouvfr/ngx-dsfr' }]);
  });

  it('lion-input-tel -> dsfr-form-tel (régions en TODO)', () => {
    const result = lion('<lion-input-tel label="Téléphone" [allowedRegions]="[\'FR\']"></lion-input-tel>');
    expect(result.content).toContain('<dsfr-form-tel label="Téléphone"></dsfr-form-tel>');
    expect(result.todos).toHaveLength(1);
  });

  it('lion-input-amount -> dsfr-form-input type="number"', () => {
    const result = lion('<lion-input-amount label="Montant" currency="EUR"></lion-input-amount>');
    expect(result.content).toContain('<dsfr-form-input label="Montant" type="number"></dsfr-form-input>');
    expect(result.todos[0]).toContain('devise');
  });

  it('lion-input-iban et lion-input-stepper : TODO systématique', () => {
    expect(todosOf('<lion-input-iban label="IBAN"></lion-input-iban>')[0]).toContain('IBAN');
    const stepper = lion('<lion-input-stepper label="Nb" min="1" max="10" step="1"></lion-input-stepper>');
    expect(stepper.content).toContain('<dsfr-form-input label="Nb" min="1" max="10" type="number"></dsfr-form-input>');
    expect(stepper.todos).toHaveLength(2);
  });
});

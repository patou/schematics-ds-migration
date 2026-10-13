import { describe, expect, it } from 'vitest';
import { lion, todosOf, toDsfr } from '../../../testing/helpers';

describe('Lion -> DSFR : boutons', () => {
  it('lion-button -> dsfr-button (texte -> label)', () => {
    expect(toDsfr('<lion-button (click)="save()">Enregistrer</lion-button>')).toBe(
      '<dsfr-button (click)="save()" label="Enregistrer"></dsfr-button>',
    );
  });

  it('importe DsfrButtonComponent', () => {
    expect(lion('<lion-button>OK</lion-button>').imports).toEqual([
      { name: 'DsfrButtonComponent', from: '@edugouvfr/ngx-dsfr' },
    ]);
  });

  it('lion-button-submit / lion-button-reset -> type', () => {
    expect(toDsfr('<lion-button-submit>Envoyer</lion-button-submit>')).toBe(
      '<dsfr-button label="Envoyer" type="submit"></dsfr-button>',
    );
    expect(toDsfr('<lion-button-reset>Effacer</lion-button-reset>')).toBe(
      '<dsfr-button label="Effacer" type="reset"></dsfr-button>',
    );
  });

  it('convertit type, disabled, aria-label, tabindex et supprime active', () => {
    expect(
      toDsfr('<lion-button type="submit" disabled aria-label="Valider" tabindex="0" active>OK</lion-button>'),
    ).toBe('<dsfr-button type="submit" [disabled]="true" ariaLabel="Valider" [tabIndex]="0" label="OK"></dsfr-button>');
    expect(toDsfr('<lion-button [disabled]="busy">OK</lion-button>')).toBe(
      '<dsfr-button [disabled]="busy" label="OK"></dsfr-button>',
    );
  });

  it('conserve les interpolations et pipes du libellé', () => {
    expect(toDsfr(`<lion-button>{{ 'actions.save' | translate }}</lion-button>`)).toBe(
      `<dsfr-button label="{{ 'actions.save' | translate }}"></dsfr-button>`,
    );
  });

  it('ajoute un TODO pour une icône dans le bouton', () => {
    const todos = todosOf('<lion-button><lion-icon icon-id="lion:space:alienSpaceship"></lion-icon> Lancer</lion-button>');
    expect(todos).toHaveLength(1);
    expect(todos[0]).toContain('lion-icon');
  });

  it('ajoute un TODO pour un attribut inconnu', () => {
    expect(todosOf('<lion-button foo="bar">OK</lion-button>')[0]).toBe(
      'Attribut "foo" de <lion-button> sans équivalent sur <dsfr-button> : foo="bar"',
    );
  });

  it('gère le préfixe', () => {
    expect(toDsfr('<acme-button-submit>OK</acme-button-submit>', { prefix: 'acme' })).toBe(
      '<dsfr-button label="OK" type="submit"></dsfr-button>',
    );
  });
});

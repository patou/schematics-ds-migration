import { describe, expect, it } from 'vitest';
import { lion, todosOf, toDsfr } from '../../../testing/helpers';

describe('Lion -> DSFR : composants divers', () => {
  it('lion-dialog -> bouton aria-controls + dsfr-modal', () => {
    const result = lion(
      [
        '<lion-dialog>',
        '  <button slot="invoker">Ouvrir</button>',
        '  <div slot="content">',
        '    <p>Bonjour</p>',
        '  </div>',
        '</lion-dialog>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      [
        '<!-- TODO(ds-migration): Renseignez le titre de la modale (titleModal), obligatoire pour l’accessibilité. -->',
        '<button class="fr-btn" aria-controls="dialog-1" data-fr-opened="false">Ouvrir</button>',
        '<dsfr-modal dialogId="dialog-1" titleModal="">',
        '  <div>',
        '    <p>Bonjour</p>',
        '  </div>',
        '</dsfr-modal>',
      ].join('\n'),
    );
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrModalComponent']);
  });

  it('lion-dialog : invoker lion-button -> dsfr-button ariaControls', () => {
    const content = toDsfr('<lion-dialog><lion-button slot="invoker">Ouvrir</lion-button><p slot="content">X</p></lion-dialog>');
    expect(content).toContain('<dsfr-button ariaControls="dialog-1" label="Ouvrir"></dsfr-button>');
    expect(content).toContain('<dsfr-modal dialogId="dialog-1" titleModal="">');
  });

  it('lion-dialog : sans invoker, TODO open()', () => {
    expect(todosOf('<lion-dialog><p slot="content">X</p></lion-dialog>')).toHaveLength(2);
  });

  it('lion-tooltip -> directive tooltip sur l’invoker', () => {
    const result = lion(
      '<lion-tooltip has-arrow><button slot="invoker" class="fr-btn">Aide</button><div slot="content">Texte "aide"</div></lion-tooltip>',
    );
    expect(result.content).toBe('<button tooltip="Texte &quot;aide&quot;" class="fr-btn">Aide</button>');
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrTooltipDirective']);
    expect(result.todos).toEqual([]);
  });

  it('lion-input-range -> dsfr-range', () => {
    expect(
      toDsfr('<lion-input-range label="Volume" min="0" max="10" step="2" unit="%" no-min-max-labels [(ngModel)]="v"></lion-input-range>'),
    ).toBe(
      '<dsfr-range label="Volume" [min]="0" [max]="10" [step]="2" suffix="%" [hideMinMax]="true" [(ngModel)]="v"></dsfr-range>',
    );
  });

  it('lion-input-file -> dsfr-upload', () => {
    const result = lion(
      '<lion-input-file label="Pièce" accept=".pdf" multiple max-file-size="1000" (file-list-changed)="onFiles($event)"></lion-input-file>',
    );
    expect(result.content).toContain(
      '<dsfr-upload label="Pièce" accept=".pdf" [multiple]="true" (fileSelect)="onFiles($event)"></dsfr-upload>',
    );
    expect(result.todos).toHaveLength(2);
  });

  it.each([
    'lion-progress-indicator',
    'lion-icon',
    'lion-drawer',
    'lion-validation-feedback',
    'lion-field',
    'lion-select-invoker',
    'lion-selected-file-list',
  ])('%s : migration manuelle', (tag) => {
    const result = lion(`<${tag}></${tag}>`);
    expect(result.content).toContain(`<${tag}></${tag}>`);
    expect(result.todos).toHaveLength(1);
    expect(result.todos[0]).toContain(tag);
  });
});

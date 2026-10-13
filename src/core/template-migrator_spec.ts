import { describe, expect, it } from 'vitest';
import { migrateTemplate, TODO_MARKER } from './template-migrator';
import { DesignSystem, MigrationDefinition } from './types';

const ds = (id: string, tagPrefix: string): DesignSystem => ({
  id,
  name: id.toUpperCase(),
  description: id,
  packages: [],
  packagePatterns: [],
  importPatterns: [],
  tagPrefix,
});

/** Migration fictive, indépendante de Lion/DSFR, pour tester le moteur. */
const migration: MigrationDefinition = {
  id: 'a-to-b',
  from: ds('a', 'a-'),
  to: ds('b', 'b-'),
  commonAttributes: {
    modelValue: { to: 'ngModel', twoWay: { event: 'value-changed', to: 'ngModel' } },
    legacy: { remove: true },
  },
  commonEvents: {
    'value-changed': { to: 'ngModelChange', replace: [['\\$event\\.target\\.value', '$$event']] },
  },
  components: [
    {
      source: 'a-button',
      target: 'b-button',
      status: 'auto',
      content: { toAttribute: 'label' },
      attributes: {
        disabled: { to: 'disabled', boolean: true },
        kind: { to: 'variant', values: { main: 'primary', other: 'secondary' } },
        size: { to: 'size', asProperty: true },
        old: { todo: 'old est obsolète.' },
        items: { to: 'items', oneWayOnly: true },
      },
      events: { pressed: 'press' },
      imports: [{ name: 'BButton', from: 'b-lib' }],
    },
    {
      source: 'a-field',
      target: 'b-field',
      status: 'partial',
      attributes: { label: 'label', helpText: 'hint' },
      slots: {
        label: { toAttribute: 'label' },
        prefix: { toContentSelector: 'before' },
        suffix: { todo: 'Suffixe non supporté.' },
        extra: { keep: true },
      },
      addAttributes: { kind: 'text' },
    },
    { source: 'a-chart', target: null, status: 'manual', todo: 'Utilisez une librairie de graphiques.' },
    {
      source: 'a-list',
      target: 'b-list',
      status: 'partial',
      transform: (el, ctx) => {
        const items = el.children.filter((c) => ctx.is(c, 'a-item')).map((c) => `'${ctx.text(c)}'`);
        ctx.todo('Liste convertie.');
        return ctx.buildElement('b-list', [...ctx.convertAttributes(el), `[items]="[${items.join(', ')}]"`], '', el);
      },
    },
  ],
};

const migrate = (template: string, prefix?: string) => migrateTemplate(template, migration, { prefix });
const html = (template: string, prefix?: string) => migrate(template, prefix).content;

describe('migrateTemplate (moteur générique)', () => {
  it('ne modifie pas un template sans composant source', () => {
    const template = '<div class="x">\n  <b-button label="ok" />\n</div>';
    const result = migrate(template);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(template);
  });

  it('renomme la balise et convertit le contenu en attribut', () => {
    expect(html('<a-button>Valider</a-button>')).toBe('<b-button label="Valider"></b-button>');
  });

  it('remplace le préfixe source configuré', () => {
    const result = migrate('<my-button>Valider</my-button>', 'my');
    expect(result.content).toBe('<b-button label="Valider"></b-button>');
    expect(result.sourceTags).toEqual(['a-button']);
  });

  it('conserve les interpolations et échappe les quotes', () => {
    expect(html(`<a-button>{{ 'save' | t }} "x"</a-button>`)).toBe(
      `<b-button label="{{ 'save' | t }} &quot;x&quot;"></b-button>`,
    );
  });

  it('convertit les attributs statiques, liés, booléens et les valeurs', () => {
    const result = migrate('<a-button disabled kind="main" size="2" [kind]="k" (pressed)="go($event)"></a-button>');
    expect(result.content).toContain(
      '<b-button [disabled]="true" variant="primary" [size]="2" [variant]="k" (press)="go($event)"></b-button>',
    );
    // Une valeur liée ne peut pas être convertie automatiquement.
    expect(result.todos).toEqual([
      'Valeurs de "kind" sur <a-button> à adapter pour <b-button> (main → primary, other → secondary).',
    ]);
  });

  it('supprime un attribut booléen à "false"', () => {
    expect(html('<a-button disabled="false"></a-button>')).toBe('<b-button></b-button>');
  });

  it('conserve les attributs génériques Angular / HTML', () => {
    expect(
      html('<a-button id="b" class="c" *ngIf="ok" #btn [attr.aria-describedby]="d" aria-label="x" data-test="t" (click)="go()"></a-button>'),
    ).toBe('<b-button id="b" class="c" *ngIf="ok" #btn [attr.aria-describedby]="d" aria-label="x" data-test="t" (click)="go()"></b-button>');
  });

  it('ajoute un TODO pour un attribut ou un événement inconnu', () => {
    const result = migrate('<div>\n  <a-button foo="bar" (boom)="x()">OK</a-button>\n</div>');
    expect(result.content).toBe(
      '<div>\n' +
        `  <!-- ${TODO_MARKER}: Attribut "foo" de <a-button> sans équivalent sur <b-button> : foo="bar" -->\n` +
        `  <!-- ${TODO_MARKER}: Événement "(boom)" de <a-button> sans équivalent sur <b-button> : (boom)="x()" -->\n` +
        '  <b-button label="OK"></b-button>\n' +
        '</div>',
    );
    expect(result.todos).toHaveLength(2);
  });

  it('ajoute le TODO défini par la règle', () => {
    expect(migrate('<a-button old="1"></a-button>').todos).toEqual(['old est obsolète.']);
  });

  it('valeur inconnue : conservée avec TODO', () => {
    const result = migrate('<a-button kind="weird"></a-button>');
    expect(result.content).toContain('variant="weird"');
    expect(result.todos[0]).toContain('"weird"');
  });

  it('supprime silencieusement les attributs "remove"', () => {
    const result = migrate('<a-button legacy></a-button>');
    expect(result.content).toBe('<b-button></b-button>');
    expect(result.todos).toEqual([]);
  });

  it('fusionne propriété + événement en liaison bidirectionnelle', () => {
    expect(html('<a-field [modelValue]="name" (value-changed)="name = $event.target.value"></a-field>')).toBe(
      '<b-field [(ngModel)]="name" kind="text"></b-field>',
    );
  });

  it('remplace les expressions des événements', () => {
    expect(html('<a-field ngModel (value-changed)="save($event.target.value)"></a-field>')).toContain(
      '(ngModelChange)="save($event)"',
    );
  });

  it('signale un (ngModelChange) sans ngModel', () => {
    expect(migrate('<a-field (value-changed)="save($event.target.value)"></a-field>').todos[0]).toContain('ngModel');
  });

  it('convertit une liaison bidirectionnelle non supportée en liaison simple', () => {
    const result = migrate('<a-button [(items)]="list"></a-button>');
    expect(result.content).toContain('<b-button [items]="list"></b-button>');
    expect(result.todos).toHaveLength(1);
  });

  it('gère les slots (attribut, projection, TODO, conservation)', () => {
    const result = migrate(
      [
        '<a-field help-text="Aide">',
        '  <label slot="label">Nom <b>complet</b></label>',
        '  <span slot="prefix">€</span>',
        '  <span slot="suffix">!</span>',
        '  <i slot="extra">x</i>',
        '  <p>contenu</p>',
        '</a-field>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      [
        `<!-- ${TODO_MARKER}: Suffixe non supporté. (<span slot="suffix">!</span>) -->`,
        '<b-field hint="Aide" label="Nom complet" kind="text">',
        '  <span before>€</span>',
        '  <i>x</i>',
        '  <p>contenu</p>',
        '</b-field>',
      ].join('\n'),
    );
  });

  it('signale un slot inconnu', () => {
    expect(migrate('<a-field><i slot="icon">*</i></a-field>').todos[0]).toContain('Slot "icon"');
  });

  it('conserve la mise en forme multi-lignes', () => {
    expect(html('<a-button\n    disabled\n    class="x"\n>OK</a-button>')).toBe(
      '<b-button\n    [disabled]="true"\n    class="x"\n    label="OK"\n></b-button>',
    );
  });

  it('conserve les balises auto-fermantes', () => {
    expect(html('<a-field label="Nom" />')).toBe('<b-field label="Nom" kind="text" />');
  });

  it('migre les composants imbriqués', () => {
    expect(html('<a-field><p><a-button>OK</a-button></p></a-field>')).toBe(
      '<b-field kind="text"><p><b-button label="OK"></b-button></p></b-field>',
    );
  });

  it('composant sans équivalent : conservé avec TODO', () => {
    const result = migrate('<a-chart [data]="d"><a-unknown></a-unknown></a-chart>');
    expect(result.content).toBe(
      `<!-- ${TODO_MARKER}: Utilisez une librairie de graphiques. -->\n<a-chart [data]="d"><a-unknown></a-unknown></a-chart>`,
    );
  });

  it('composant source inconnu : TODO', () => {
    const result = migrate('<span>x</span> <a-unknown></a-unknown>');
    expect(result.content).toContain(`x</span> <!-- ${TODO_MARKER}: <a-unknown> n'a pas d'équivalent connu`);
    expect(result.sourceTags).toEqual(['a-unknown']);
  });

  it('applique les transformations personnalisées', () => {
    const result = migrate('<a-list id="l"><a-item>Un</a-item><a-item>Deux</a-item></a-list>');
    expect(result.content).toBe(
      `<!-- ${TODO_MARKER}: Liste convertie. -->\n<b-list id="l" [items]="['Un', 'Deux']"></b-list>`,
    );
  });

  it('collecte les imports nécessaires', () => {
    expect(migrate('<a-button></a-button><a-button></a-button>').imports).toEqual([{ name: 'BButton', from: 'b-lib' }]);
  });

  it('est idempotente', () => {
    const once = html('<a-button foo="1">OK</a-button><a-chart></a-chart>');
    expect(html(once)).toBe(once);
  });

  describe('préfixe', () => {
    it('migre uniquement les balises préfixées', () => {
      expect(html('<my-button>OK</my-button><a-button>KO</a-button>', 'my')).toBe(
        '<b-button label="OK"></b-button><a-button>KO</a-button>',
      );
    });

    it('accepte un préfixe terminé par un tiret et les transformations personnalisées', () => {
      expect(html('<my-list><my-item>Un</my-item></my-list>', 'my-')).toContain(`[items]="['Un']"`);
    });

    it('signale les balises préfixées inconnues', () => {
      expect(migrate('<my-unknown></my-unknown>', 'my').sourceTags).toEqual(['a-unknown']);
    });
  });
});

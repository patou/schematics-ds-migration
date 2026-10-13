import { beforeEach, describe, expect, it } from 'vitest';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { createRunner, createWorkspace } from '../testing/helpers';

const runner = createRunner();

describe('migrate', () => {
  let tree: UnitTestTree;

  beforeEach(async () => {
    tree = await createWorkspace();
  });

  const run = (options: Record<string, unknown> = {}) => runner.runSchematic('migrate', { from: 'lion', to: 'dsfr', ...options }, tree);

  it('migre un composant standalone avec templateUrl', async () => {
    tree.create(
      '/projects/app/src/app/login/login.html',
      '<form>\n  <lion-button-submit>Connexion</lion-button-submit>\n</form>\n',
    );
    tree.create(
      '/projects/app/src/app/login/login.ts',
      [
        "import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';",
        "import '@lion/ui/define/lion-button-submit.js';",
        '',
        '@Component({',
        "  selector: 'app-login',",
        "  templateUrl: './login.html',",
        '  schemas: [CUSTOM_ELEMENTS_SCHEMA],',
        '})',
        'export class Login {}',
        '',
      ].join('\n'),
    );
    const result = await run();
    expect(result.readText('/projects/app/src/app/login/login.html')).toBe(
      '<form>\n  <dsfr-button label="Connexion" type="submit"></dsfr-button>\n</form>\n',
    );
    expect(result.readText('/projects/app/src/app/login/login.ts')).toBe(
      [
        "import { Component } from '@angular/core';",
        "import { DsfrButtonComponent } from '@edugouvfr/ngx-dsfr';",
        '',
        '@Component({',
        '  imports: [DsfrButtonComponent],',
        "  selector: 'app-login',",
        "  templateUrl: './login.html',",
        '})',
        'export class Login {}',
        '',
      ].join('\n'),
    );
  });

  it('migre un template inline et fusionne les imports existants', async () => {
    tree.create(
      '/projects/app/src/app/inline.ts',
      [
        "import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';",
        "import { DsfrAlertComponent } from '@edugouvfr/ngx-dsfr';",
        "import { Other } from './other';",
        '',
        '@Component({',
        "  selector: 'app-inline',",
        '  imports: [Other, DsfrAlertComponent],',
        '  template: `<lion-button (click)="go()">Go</lion-button> <app-other />`,',
        '  schemas: [CUSTOM_ELEMENTS_SCHEMA],',
        '})',
        'export class Inline {}',
        '',
      ].join('\n'),
    );
    tree.create('/projects/app/src/app/other.ts', "@Component({ selector: 'app-other', template: '' }) export class Other {}");
    const content = (await run()).readText('/projects/app/src/app/inline.ts');
    expect(content).toContain("import { DsfrAlertComponent, DsfrButtonComponent } from '@edugouvfr/ngx-dsfr';");
    expect(content).toContain('imports: [Other, DsfrAlertComponent, DsfrButtonComponent],');
    expect(content).toContain('template: `<dsfr-button (click)="go()" label="Go"></dsfr-button> <app-other />`,');
    expect(content).not.toContain('CUSTOM_ELEMENTS_SCHEMA');
  });

  it("conserve CUSTOM_ELEMENTS_SCHEMA si d'autres web components sont utilisés", async () => {
    tree.create(
      '/projects/app/src/app/mixed.ts',
      [
        "import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';",
        '@Component({',
        "  selector: 'app-mixed',",
        "  template: '<lion-button>A</lion-button><other-wc></other-wc>',",
        '  schemas: [CUSTOM_ELEMENTS_SCHEMA],',
        '})',
        'export class Mixed {}',
      ].join('\n'),
    );
    const content = (await run()).readText('/projects/app/src/app/mixed.ts');
    expect(content).toContain('schemas: [CUSTOM_ELEMENTS_SCHEMA]');
    expect(content).toContain(`template: '<dsfr-button label="A"></dsfr-button><other-wc></other-wc>'`);
  });

  it('bascule un template entre quotes en template literal si nécessaire', async () => {
    tree.create(
      '/projects/app/src/app/quote.ts',
      `import { Component } from '@angular/core';\n@Component({ selector: 'app-q', template: '<lion-button>L\\'aide</lion-button>' })\nexport class Q {}\n`,
    );
    const content = (await run()).readText('/projects/app/src/app/quote.ts');
    expect(content).toContain('template: `<dsfr-button label="L\'aide"></dsfr-button>`');
  });

  it('ajoute les imports au NgModule pour un composant non standalone', async () => {
    tree.create(
      '/projects/app/src/app/legacy/legacy.component.ts',
      [
        "import { Component } from '@angular/core';",
        "@Component({ selector: 'app-legacy', standalone: false, template: '<lion-button>OK</lion-button>' })",
        'export class LegacyComponent {}',
      ].join('\n'),
    );
    tree.create(
      '/projects/app/src/app/legacy/legacy.module.ts',
      [
        "import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';",
        "import { LegacyComponent } from './legacy.component';",
        '',
        '@NgModule({',
        '  declarations: [LegacyComponent],',
        '  schemas: [CUSTOM_ELEMENTS_SCHEMA],',
        '})',
        'export class LegacyModule {}',
      ].join('\n'),
    );
    const content = (await run()).readText('/projects/app/src/app/legacy/legacy.module.ts');
    expect(content).toContain('imports: [DsfrButtonComponent],');
    expect(content).toContain("import { DsfrButtonComponent } from '@edugouvfr/ngx-dsfr';");
  });

  it('ne migre que le dossier demandé', async () => {
    tree.create('/projects/app/src/app/a/a.html', '<lion-button>A</lion-button>');
    tree.create('/projects/app/src/app/b/b.html', '<lion-button>B</lion-button>');
    const result = await run({ path: 'projects/app/src/app/a' });
    expect(result.readText('/projects/app/src/app/a/a.html')).toContain('dsfr-button');
    expect(result.readText('/projects/app/src/app/b/b.html')).toContain('lion-button');
  });

  it('applique le préfixe', async () => {
    tree.create('/projects/app/src/app/p.html', '<my-button>A</my-button>');
    const result = await run({ prefix: 'my' });
    expect(result.readText('/projects/app/src/app/p.html')).toBe('<dsfr-button label="A"></dsfr-button>');
  });

  it('affiche les fichiers analysés et les balises reconnues en mode verbose', async () => {
    tree.create('/projects/app/src/app/p.html', '<lion-button>A</lion-button>');
    const messages: string[] = [];
    const subscription = runner.logger.subscribe((entry) => messages.push(entry.message));

    await run({ verbose: true });
    subscription.unsubscribe();

    expect(messages).toContain('[verbose] HTML : /projects/app/src/app/p.html');
    expect(messages).toContain(
      '[verbose] /projects/app/src/app/p.html : balises source reconnues : lion-button ; conversion produite.',
    );
  });

  it('échoue pour un dossier inexistant ou une migration inconnue', async () => {
    await expect(run({ path: 'nope' })).rejects.toThrow(/vide ou n'existe pas/);
    await expect(run({ to: 'material' })).rejects.toThrow();
  });
});

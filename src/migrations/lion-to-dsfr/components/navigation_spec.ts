import { describe, expect, it } from 'vitest';
import { lion, todosOf, toDsfr } from '../../../testing/helpers';

describe('Lion -> DSFR : navigation et affichage', () => {
  it('lion-tabs -> dsfr-tabs / dsfr-tab', () => {
    const result = lion(
      [
        '<lion-tabs selected-index="1" (selected-changed)="onTab($event.target.selectedIndex)">',
        '  <button slot="tab">Infos</button>',
        '  <div slot="panel">',
        '    <p>Contenu</p>',
        '  </div>',
        '  <button slot="tab" disabled>{{ title }}</button>',
        '  <p slot="panel">Travail</p>',
        '</lion-tabs>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      [
        '<dsfr-tabs [selectedTabIndex]="1" (tabIndexSelect)="onTab($event)">',
        '  <dsfr-tab tabId="tab-1" label="Infos">',
        '    <div>',
        '      <p>Contenu</p>',
        '    </div>',
        '  </dsfr-tab>',
        '  <dsfr-tab tabId="tab-2" label="{{ title }}" [disabled]="true">',
        '    <p>Travail</p>',
        '  </dsfr-tab>',
        '</dsfr-tabs>',
      ].join('\n'),
    );
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrTabsComponent', 'DsfrTabComponent']);
    expect(result.todos).toEqual([]);
  });

  it('lion-tabs : identifiants uniques et incohérences signalées', () => {
    expect(toDsfr('<p id="tab-1"></p><lion-tabs><button slot="tab">A</button><p slot="panel">a</p></lion-tabs>')).toContain(
      'tabId="tab-2"',
    );
    expect(todosOf('<lion-tabs><button slot="tab">A</button></lion-tabs>')).toHaveLength(1);
    expect(todosOf('<lion-tabs><button slot="tab" *ngFor="let t of tabs">{{t}}</button></lion-tabs>').length).toBeGreaterThan(0);
  });

  it('lion-accordion -> dsfr-accordions-group / dsfr-accordion', () => {
    const result = lion(
      [
        '<lion-accordion>',
        '  <h3 slot="invoker"><button>Section 1</button></h3>',
        '  <p slot="content">Texte 1</p>',
        '</lion-accordion>',
      ].join('\n'),
    );
    expect(result.content).toBe(
      [
        '<dsfr-accordions-group [ungroup]="true">',
        '  <dsfr-accordion heading="Section 1" headingLevel="H3">',
        '    <p>Texte 1</p>',
        '  </dsfr-accordion>',
        '</dsfr-accordions-group>',
      ].join('\n'),
    );
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrAccordionsGroupComponent', 'DsfrAccordionComponent']);
  });

  it('lion-accordion exclusive : groupe DSFR par défaut', () => {
    expect(toDsfr('<lion-accordion exclusive></lion-accordion>')).toBe('<dsfr-accordions-group></dsfr-accordions-group>');
  });

  it('lion-collapsible -> dsfr-accordion', () => {
    expect(
      toDsfr(
        [
          '<lion-collapsible [opened]="open" (opened-changed)="open = $event.target.opened">',
          '  <button slot="invoker">Plus</button>',
          '  <div slot="content">Détails</div>',
          '</lion-collapsible>',
        ].join('\n'),
      ),
    ).toBe(
      ['<dsfr-accordion heading="Plus" [(expanded)]="open">', '  <div>Détails</div>', '</dsfr-accordion>'].join('\n'),
    );
    expect(toDsfr('<lion-collapsible opened><span slot="invoker">A</span><p slot="content">B</p></lion-collapsible>')).toContain(
      '<dsfr-accordion heading="A" [expanded]="true">',
    );
  });

  it('lion-pagination -> dsfr-pagination', () => {
    const result = lion(
      '<lion-pagination count="20" [current]="page" (current-changed)="page = $event.target.current"></lion-pagination>',
    );
    expect(result.content).toBe(
      '<dsfr-pagination [pageCount]="20" [currentPage]="page" (pageSelect)="page = $event"></dsfr-pagination>',
    );
    expect(result.imports.map((i) => i.name)).toEqual(['DsfrPaginationComponent']);
  });

  it('lion-steps : migration manuelle (un seul TODO)', () => {
    const todos = todosOf('<lion-steps><lion-step initial-step>1</lion-step><lion-step>2</lion-step></lion-steps>');
    expect(todos).toHaveLength(1);
    expect(todos[0]).toContain('dsfr-stepper');
  });
});

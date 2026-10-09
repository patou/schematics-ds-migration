import { describe, expect, it } from 'vitest';
import { ElementNode, parseHtml, textContent, walkElements } from './parser';

function elements(source: string): ElementNode[] {
  const list: ElementNode[] = [];
  walkElements(parseHtml(source).children, (el) => list.push(el));
  return list;
}

describe('parseHtml', () => {
  it('conserve les positions des éléments et des attributs', () => {
    const source = '<div class="a"><lion-button disabled (click)="go()">OK</lion-button></div>';
    const [div, button] = elements(source);
    expect(div.name).toBe('div');
    expect(source.slice(button.start, button.end)).toBe('<lion-button disabled (click)="go()">OK</lion-button>');
    expect(button.attrs.map((a) => [a.name, a.value])).toEqual([
      ['disabled', undefined],
      ['(click)', 'go()'],
    ]);
    expect(source.slice(button.attrs[1].start, button.attrs[1].end)).toBe('(click)="go()"');
  });

  it('gère la syntaxe Angular dans les attributs', () => {
    const [el] = elements(`<x [(ngModel)]="v" *ngIf="a > b" #ref [attr.aria-label]='l' @fade bind-x="y"></x>`);
    expect(el.attrs.map((a) => a.name)).toEqual(['[(ngModel)]', '*ngIf', '#ref', '[attr.aria-label]', '@fade', 'bind-x']);
    expect(el.attrs[1].value).toBe('a > b');
    expect(el.attrs[3].quote).toBe("'");
  });

  it('gère les éléments auto-fermants, vides et non fermés', () => {
    const els = elements('<lion-input label="a" /><br><p>texte<span>x</span>');
    expect(els.map((e) => e.name)).toEqual(['lion-input', 'br', 'p', 'span']);
    expect(els[0].selfClosing).toBe(true);
    expect(els[1].void).toBe(true);
    expect(els[2].endTagStart).toBeUndefined();
  });

  it('conserve les commentaires, le texte et les blocs de contrôle', () => {
    const source = '@if (ok) {\n  <!-- note --><b>{{ a < b }}</b>\n}';
    const doc = parseHtml(source);
    expect(doc.children.map((c) => c.type)).toEqual(['text', 'comment', 'element', 'text']);
    expect(textContent(doc.children[2])).toBe('{{ a < b }}');
  });

  it('ne parse pas le contenu des éléments textuels bruts', () => {
    const els = elements('<textarea><lion-button></lion-button></textarea>');
    expect(els.map((e) => e.name)).toEqual(['textarea']);
  });

  it('accepte les attributs sans quotes et multi-lignes', () => {
    const [el] = elements('<lion-input\n  label=Nom\n  name="n"\n></lion-input>');
    expect(el.attrs.map((a) => [a.name, a.value, a.leading])).toEqual([
      ['label', 'Nom', '\n  '],
      ['name', 'n', '\n  '],
    ]);
    expect(el.startTagTrailing).toBe('\n');
  });
});

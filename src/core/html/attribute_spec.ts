import { describe, expect, it } from 'vitest';
import { camelCase, formatAttribute, kebabCase, parseAttribute } from './attribute';

const parse = (name: string, value?: string) => parseAttribute({ name, value, start: 0, end: 0, leading: ' ' });

describe('parseAttribute', () => {
  it.each([
    ['label', 'static', 'label'],
    ['[label]', 'property', 'label'],
    ['bind-label', 'property', 'label'],
    ['[(value)]', 'twoWay', 'value'],
    ['bindon-value', 'twoWay', 'value'],
    ['(click)', 'event', 'click'],
    ['on-click', 'event', 'click'],
    ['(model-value-changed)', 'event', 'model-value-changed'],
    ['*ngIf', 'structural', 'ngIf'],
    ['#ref', 'reference', 'ref'],
    ['[attr.aria-label]', 'attr', 'attr.aria-label'],
    ['[class.active]', 'attr', 'class.active'],
    ['i18n-label', 'i18n', 'label'],
    ['@fade', 'animation', '@fade'],
    ['let-item', 'let', 'item'],
  ])('%s -> %s', (name, kind, logical) => {
    const parsed = parse(name);
    expect(parsed.kind).toBe(kind);
    expect(parsed.name).toBe(logical);
  });
});

describe('utilitaires', () => {
  it('convertit les casses', () => {
    expect(camelCase('help-text')).toBe('helpText');
    expect(kebabCase('helpText')).toBe('help-text');
  });

  it('formate les attributs Angular', () => {
    expect(formatAttribute('static', 'label', 'Nom')).toBe('label="Nom"');
    expect(formatAttribute('property', 'disabled', 'true')).toBe('[disabled]="true"');
    expect(formatAttribute('twoWay', 'ngModel', 'x', "'")).toBe("[(ngModel)]='x'");
    expect(formatAttribute('event', 'click', 'go()')).toBe('(click)="go()"');
    expect(formatAttribute('static', 'required', undefined)).toBe('required');
  });
});

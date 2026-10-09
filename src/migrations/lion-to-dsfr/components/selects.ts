import { escapeAttributeValue, parseAttribute } from '../../../core/html/attribute';
import { ElementNode, elementChildren, HtmlNode } from '../../../core/html/parser';
import { ComponentMapping } from '../../../core/types';
import { shorten, TransformContext } from '../../../core/template-migrator';
import { attrExpression, dsfr, FIELD_ATTRIBUTES, safeExpression, textExpression } from '../shared';

const SELECT_ATTRIBUTES = {
  ...FIELD_ATTRIBUTES,
  required: { to: 'required', boolean: true },
  placeholder: 'placeholder',
};

/** Construit le littéral `[options]` à partir d'éléments `<option>` / `<optgroup>` / `<lion-option>`. */
function buildOptions(
  container: ElementNode,
  ctx: TransformContext,
  isOption: (el: ElementNode) => boolean,
  state: { placeholder?: string; first: boolean },
): string[] {
  const options: string[] = [];
  if (hasDynamicContent(container)) {
    ctx.todo(
      `Options générées dynamiquement dans <${container.name}> : construisez le tableau [options] dans le composant (${shorten(
        container.children.map((c) => ctx.raw(c)).join(''),
      )}).`,
    );
    return options;
  }
  for (const child of elementChildren(container)) {
    if (child.attrs.some((a) => a.name.startsWith('*'))) {
      ctx.todo(
        `Options générées dynamiquement : construisez le tableau [options] dans le composant (${shorten(ctx.raw(child))}).`,
      );
      continue;
    }
    const name = child.name.toLowerCase();
    if (name === 'optgroup') {
      const label = attrExpression(ctx.attr(child, 'label')) ?? "''";
      const nested = buildOptions(child, ctx, isOption, { ...state, first: false });
      options.push(`{ label: ${label}, value: null, options: [${nested.join(', ')}] }`);
      state.first = false;
      continue;
    }
    if (!isOption(child)) {
      if (name === 'lion-options' || name === 'select') {
        options.push(...buildOptions(child, ctx, isOption, state));
      } else {
        ctx.todo(`Élément non supporté dans la liste d’options : ${ctx.raw(child).replace(/\s+/g, ' ').slice(0, 100)}`);
      }
      continue;
    }
    const text = ctx.text(child);
    const label = safeExpression(attrExpression(ctx.attr(child, 'label')) ?? textExpression(text));
    const valueAttr = ctx.attr(child, 'ngValue') ?? ctx.attr(child, 'value') ?? ctx.attr(child, 'choiceValue');
    const value = safeExpression(attrExpression(valueAttr)) ?? label;
    const first = state.first;
    state.first = false;
    if (first && valueAttr?.kind === 'static' && !valueAttr.raw.value) {
      state.placeholder = text;
      continue;
    }
    const parts = [`label: ${label}`, `value: ${value}`];
    const disabled = ctx.attr(child, 'disabled');
    if (disabled && !(disabled.kind === 'static' && disabled.raw.value === 'false')) {
      parts.push(`disabled: ${disabled.kind === 'static' ? 'true' : disabled.raw.value?.trim()}`);
    }
    if (ctx.attr(child, 'selected') || ctx.attr(child, 'checked')) {
      ctx.todo(`Option sélectionnée par défaut (${text}) : initialisez la valeur du modèle à ${value}.`);
    }
    if (elementChildren(child).length && name !== 'option') {
      ctx.todo(`Contenu riche de l’option "${text}" converti en texte.`);
    }
    options.push(`{ ${parts.join(', ')} }`);
  }
  return options;
}

/** Le conteneur contient-il du texte non vide (blocs @for / @if) ? */
function hasDynamicContent(el: ElementNode): boolean {
  return el.children.some((c: HtmlNode) => c.type === 'text' && /@(for|if|switch)\b/.test(c.value));
}

function selectTransform(optionTag: (ctx: TransformContext) => (el: ElementNode) => boolean) {
  return (el: ElementNode, ctx: TransformContext): string => {
    const attrs = ctx.convertAttributes(el);
    const state: { placeholder?: string; first: boolean } = { first: true };
    const options: string[] = [];
    for (const child of elementChildren(el)) {
      const slot = child.attrs.find((a) => a.name === 'slot')?.value;
      if (slot === 'label' || slot === 'help-text') {
        const attrName = slot === 'label' ? 'label' : 'hint';
        if (!attrs.some((a) => new RegExp(`^\\s*\\[?${attrName}\\]?=`).test(a))) attrs.push(` ${attrName}="${escapeAttributeValue(ctx.text(child))}"`);
        continue;
      }
      if (slot === 'input' || child.name.toLowerCase() === ctx.tag('lion-options')) {
        const ignored = child.attrs.map(parseAttribute).filter((p) => p.name !== 'slot');
        if (ignored.length) {
          ctx.todo(
            `Attributs de <${child.name}> à reporter sur <dsfr-form-select> : ${ignored.map((p) => ctx.raw({ type: 'text', value: '', start: p.raw.start, end: p.raw.end })).join(' ')}`,
          );
        }
        options.push(...buildOptions(child, ctx, optionTag(ctx), state));
        continue;
      }
      if (optionTag(ctx)(child)) {
        options.push(...buildOptions(el, ctx, optionTag(ctx), state));
        break;
      }
      ctx.todo(`Contenu non supporté dans <dsfr-form-select> : ${ctx.raw(child).replace(/\s+/g, ' ').slice(0, 100)}`);
    }
    if (state.placeholder && !attrs.some((a) => /^\s*\[?placeholder\]?=/.test(a))) {
      attrs.push(` placeholder="${escapeAttributeValue(state.placeholder)}"`);
    }
    attrs.push(` [options]="[${options.join(', ')}]"`);
    return ctx.buildElement('dsfr-form-select', attrs, el.selfClosing ? undefined : '', el);
  };
}

const SELECT_NOTES = [
  'Les `<option>` deviennent des entrées `{ label, value }` de `[options]` ; une première option à valeur vide devient le `placeholder`.',
  'Les `<optgroup>` deviennent des entrées `{ label, options: [...] }`.',
  'Les options générées par `@for` / `*ngFor` doivent être construites dans le composant.',
];

/** Incrément 4 : listes déroulantes. */
export const SELECT_MAPPINGS: ComponentMapping[] = [
  {
    source: 'lion-select',
    target: 'dsfr-form-select',
    status: 'auto',
    description: 'Liste déroulante native (`<select slot="input">`) → `dsfr-form-select` avec `[options]`.',
    attributes: SELECT_ATTRIBUTES,
    events: {
      change: { to: 'selectChange', todo: '(change) → (selectChange) : vérifiez l’usage de $event (valeur sélectionnée).' },
    },
    slots: {
      input: { todo: 'Le <select slot="input"> est remplacé par [options].' },
    },
    imports: [dsfr('DsfrFormSelectComponent')],
    transform: selectTransform(() => (el) => el.name.toLowerCase() === 'option'),
    notes: SELECT_NOTES,
  },
  {
    source: 'lion-select-rich',
    target: 'dsfr-form-select',
    status: 'partial',
    description: 'Liste déroulante riche → `dsfr-form-select` (le contenu riche des options devient du texte).',
    attributes: {
      ...SELECT_ATTRIBUTES,
      interactionMode: { remove: true, doc: 'Supprimé.' },
    },
    imports: [dsfr('DsfrFormSelectComponent')],
    transform: selectTransform((ctx) => (el) => ctx.is(el, 'lion-option')),
    notes: SELECT_NOTES,
  },
  {
    source: 'lion-option',
    target: null,
    status: 'manual',
    description: 'Option isolée (hors lion-select-rich).',
    todo: 'lion-option hors d’un lion-select-rich : utilisez [options] sur <dsfr-form-select>.',
  },
  {
    source: 'lion-options',
    target: null,
    status: 'manual',
    description: 'Conteneur d’options isolé.',
    todo: 'lion-options hors d’un lion-select-rich : utilisez [options] sur <dsfr-form-select>.',
  },
  {
    source: 'lion-combobox',
    target: null,
    status: 'manual',
    description: 'Liste avec saisie et autocomplétion : pas d’équivalent dans ngx-dsfr.',
    todo:
      'lion-combobox n’a pas d’équivalent dans ngx-dsfr : utilisez <dsfr-form-select>, <dsfr-search-bar> ou un composant spécifique.',
  },
  {
    source: 'lion-listbox',
    target: null,
    status: 'manual',
    description: 'Liste de sélection : pas d’équivalent dans ngx-dsfr.',
    todo: 'lion-listbox n’a pas d’équivalent dans ngx-dsfr : utilisez <dsfr-form-select> ou <dsfr-form-radio>.',
  },
];

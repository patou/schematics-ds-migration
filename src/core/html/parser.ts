/**
 * Parseur HTML minimaliste, tolérant et conscient de la syntaxe des templates Angular.
 *
 * Contrairement à un parseur "classique" (parse5, ...), il conserve la position exacte de
 * chaque noeud et de chaque attribut dans la source. Cela permet de ne réécrire que les
 * portions modifiées d'un template et de préserver la mise en forme d'origine.
 */

export interface SourceSpan {
  start: number;
  end: number;
}

export interface HtmlAttribute extends SourceSpan {
  /** Nom brut tel qu'écrit dans le template : `label`, `[label]`, `(click)`, `*ngIf`, ... */
  name: string;
  /** Valeur (sans les quotes), `undefined` si l'attribut n'a pas de valeur. */
  value?: string;
  quote?: '"' | "'" | '';
  /** Espaces qui précèdent l'attribut dans la balise ouvrante. */
  leading: string;
}

export interface ElementNode extends SourceSpan {
  type: 'element';
  name: string;
  attrs: HtmlAttribute[];
  children: HtmlNode[];
  parent?: ElementNode;
  /** Fin (exclusive) de la balise ouvrante. */
  startTagEnd: number;
  /** Début de la balise fermante, `undefined` si l'élément n'en a pas. */
  endTagStart?: number;
  selfClosing: boolean;
  void: boolean;
  /** Espaces entre le dernier attribut et `>` ou `/>`. */
  startTagTrailing: string;
}

export interface TextNode extends SourceSpan {
  type: 'text';
  value: string;
  parent?: ElementNode;
}

export interface CommentNode extends SourceSpan {
  type: 'comment';
  value: string;
  parent?: ElementNode;
}

export type HtmlNode = ElementNode | TextNode | CommentNode;

export interface HtmlDocument {
  source: string;
  children: HtmlNode[];
}

export const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

const TAG_NAME_START = /[A-Za-z]/;
const TAG_NAME_CHAR = /[\w:.-]/;
const WHITESPACE = /\s/;

export function parseHtml(source: string): HtmlDocument {
  const root: HtmlNode[] = [];
  const stack: ElementNode[] = [];
  let pos = 0;
  let textStart = 0;

  const currentChildren = () => (stack.length ? stack[stack.length - 1].children : root);
  const currentParent = () => (stack.length ? stack[stack.length - 1] : undefined);

  const flushText = (end: number) => {
    if (end > textStart) {
      currentChildren().push({
        type: 'text',
        value: source.slice(textStart, end),
        start: textStart,
        end,
        parent: currentParent(),
      });
    }
  };

  while (pos < source.length) {
    if (source[pos] !== '<') {
      pos++;
      continue;
    }

    // Commentaire
    if (source.startsWith('<!--', pos)) {
      flushText(pos);
      const close = source.indexOf('-->', pos + 4);
      const end = close === -1 ? source.length : close + 3;
      currentChildren().push({
        type: 'comment',
        value: source.slice(pos + 4, close === -1 ? source.length : close),
        start: pos,
        end,
        parent: currentParent(),
      });
      pos = end;
      textStart = pos;
      continue;
    }

    // Balise fermante
    if (source[pos + 1] === '/' && TAG_NAME_START.test(source[pos + 2] ?? '')) {
      let nameEnd = pos + 2;
      while (nameEnd < source.length && TAG_NAME_CHAR.test(source[nameEnd])) nameEnd++;
      const name = source.slice(pos + 2, nameEnd);
      const gt = source.indexOf('>', nameEnd);
      const end = gt === -1 ? source.length : gt + 1;
      const index = findOpenElement(stack, name);
      if (index === -1) {
        // Balise fermante orpheline : conservée comme du texte.
        pos = end;
        continue;
      }
      flushText(pos);
      // Ferme implicitement les éléments non fermés.
      while (stack.length > index + 1) {
        stack.pop()!.end = pos;
      }
      const element = stack.pop()!;
      element.endTagStart = pos;
      element.end = end;
      pos = end;
      textStart = pos;
      continue;
    }

    // Balise ouvrante
    if (TAG_NAME_START.test(source[pos + 1] ?? '')) {
      const parsed = parseStartTag(source, pos);
      if (!parsed) {
        pos++;
        continue;
      }
      flushText(pos);
      const lowerName = parsed.name.toLowerCase();
      const isVoid = VOID_ELEMENTS.has(lowerName);
      const element: ElementNode = {
        type: 'element',
        name: parsed.name,
        attrs: parsed.attrs,
        children: [],
        parent: currentParent(),
        start: pos,
        end: parsed.end,
        startTagEnd: parsed.end,
        selfClosing: parsed.selfClosing,
        void: isVoid,
        startTagTrailing: parsed.trailing,
      };
      currentChildren().push(element);
      pos = parsed.end;
      textStart = pos;

      if (!parsed.selfClosing && !isVoid) {
        if (RAW_TEXT_ELEMENTS.has(lowerName)) {
          const close = source.toLowerCase().indexOf(`</${lowerName}`, pos);
          const contentEnd = close === -1 ? source.length : close;
          if (contentEnd > pos) {
            element.children.push({
              type: 'text',
              value: source.slice(pos, contentEnd),
              start: pos,
              end: contentEnd,
              parent: element,
            });
          }
          if (close === -1) {
            element.end = source.length;
          } else {
            const gt = source.indexOf('>', close);
            element.endTagStart = close;
            element.end = gt === -1 ? source.length : gt + 1;
          }
          pos = element.end;
          textStart = pos;
        } else {
          stack.push(element);
        }
      }
      continue;
    }

    pos++;
  }

  flushText(source.length);
  while (stack.length) {
    stack.pop()!.end = source.length;
  }

  return { source, children: root };
}

function findOpenElement(stack: ElementNode[], name: string): number {
  const lower = name.toLowerCase();
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].name.toLowerCase() === lower) return i;
  }
  return -1;
}

interface ParsedStartTag {
  name: string;
  attrs: HtmlAttribute[];
  end: number;
  selfClosing: boolean;
  trailing: string;
}

function parseStartTag(source: string, start: number): ParsedStartTag | undefined {
  let pos = start + 1;
  while (pos < source.length && TAG_NAME_CHAR.test(source[pos])) pos++;
  const name = source.slice(start + 1, pos);
  const attrs: HtmlAttribute[] = [];

  while (pos < source.length) {
    const wsStart = pos;
    while (pos < source.length && WHITESPACE.test(source[pos])) pos++;
    const leading = source.slice(wsStart, pos);

    if (source[pos] === '>') {
      return { name, attrs, end: pos + 1, selfClosing: false, trailing: leading };
    }
    if (source[pos] === '/' && source[pos + 1] === '>') {
      return { name, attrs, end: pos + 2, selfClosing: true, trailing: leading };
    }
    if (pos >= source.length) return undefined;

    const attrStart = pos;
    while (pos < source.length) {
      const c = source[pos];
      if (WHITESPACE.test(c) || c === '=' || c === '>' || c === '"' || c === "'") break;
      if (c === '/' && source[pos + 1] === '>') break;
      pos++;
    }
    if (pos === attrStart) {
      // Caractère inattendu : ignoré pour éviter une boucle infinie.
      pos++;
      continue;
    }
    const attrName = source.slice(attrStart, pos);

    let lookahead = pos;
    while (lookahead < source.length && WHITESPACE.test(source[lookahead])) lookahead++;
    if (source[lookahead] === '=') {
      lookahead++;
      while (lookahead < source.length && WHITESPACE.test(source[lookahead])) lookahead++;
      const q = source[lookahead];
      if (q === '"' || q === "'") {
        const close = source.indexOf(q, lookahead + 1);
        if (close === -1) return undefined;
        attrs.push({
          name: attrName,
          value: source.slice(lookahead + 1, close),
          quote: q,
          leading,
          start: attrStart,
          end: close + 1,
        });
        pos = close + 1;
      } else {
        let valueEnd = lookahead;
        while (valueEnd < source.length && !WHITESPACE.test(source[valueEnd]) && source[valueEnd] !== '>') {
          valueEnd++;
        }
        attrs.push({
          name: attrName,
          value: source.slice(lookahead, valueEnd),
          quote: '',
          leading,
          start: attrStart,
          end: valueEnd,
        });
        pos = valueEnd;
      }
    } else {
      attrs.push({ name: attrName, leading, start: attrStart, end: pos });
    }
  }
  return undefined;
}

/** Parcourt récursivement les éléments (profondeur d'abord). */
export function walkElements(nodes: HtmlNode[], visit: (el: ElementNode) => void): void {
  for (const node of nodes) {
    if (node.type === 'element') {
      visit(node);
      walkElements(node.children, visit);
    }
  }
}

export function getAttribute(el: ElementNode, name: string): HtmlAttribute | undefined {
  return el.attrs.find((a) => a.name === name);
}

/** Contenu textuel brut d'un noeud (balises et commentaires retirés). */
export function textContent(node: HtmlNode): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'comment') return '';
  return node.children.map(textContent).join('');
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function elementChildren(el: ElementNode): ElementNode[] {
  return el.children.filter((c): c is ElementNode => c.type === 'element');
}

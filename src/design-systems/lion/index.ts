import { DesignSystem } from '../../core/types';

/** Lion (ING) : web components accessibles, sans style imposé. */
export const lionDesignSystem: DesignSystem = {
  id: 'lion',
  name: 'Lion',
  description: 'Web components accessibles de ING (@lion/ui).',
  documentation: 'https://lion.js.org/',
  packages: [{ name: '@lion/ui', version: '^0.21.1' }],
  packagePatterns: ['@lion/'],
  importPatterns: ['@lion/'],
  tagPrefix: 'lion-',
  setupNotes: [
    "Importez les définitions des web components utilisés, ex : import '@lion/ui/define/lion-button.js';",
    'Ajoutez CUSTOM_ELEMENTS_SCHEMA aux composants Angular qui utilisent des balises lion-*.',
  ],
};

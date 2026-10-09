import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@lion/ui/define/lion-accordion.js';
import '@lion/ui/define/lion-collapsible.js';
import '@lion/ui/define/lion-pagination.js';
import '@lion/ui/define/lion-dialog.js';
import '@lion/ui/define/lion-tooltip.js';
import '@lion/ui/define/lion-button.js';
import '@lion/ui/define/lion-progress-indicator.js';

interface Product {
  name: string;
  description: string;
}

@Component({
  selector: 'app-catalog',
  template: `
    <h2>Catalogue</h2>

    <lion-accordion>
      @for (product of products; track product.name) {
        <h3 slot="invoker"><button>{{ product.name }}</button></h3>
        <p slot="content">{{ product.description }}</p>
      }
    </lion-accordion>

    <lion-collapsible [opened]="showFaq" (opened-changed)="showFaq = $event.target.opened">
      <button slot="invoker">Questions fréquentes</button>
      <div slot="content">
        <p>Livraison sous 48 h.</p>
      </div>
    </lion-collapsible>

    <lion-pagination count="12" [current]="page" (current-changed)="page = $event.target.current"></lion-pagination>

    <lion-dialog>
      <lion-button slot="invoker">Nous contacter</lion-button>
      <div slot="content">
        <h2>Contact</h2>
        <p>Écrivez-nous à contact&#64;example.com</p>
      </div>
    </lion-dialog>

    <lion-tooltip has-arrow>
      <button slot="invoker" type="button">?</button>
      <div slot="content">Les prix sont indiqués TTC.</div>
    </lion-tooltip>

    @if (loading) {
      <lion-progress-indicator></lion-progress-indicator>
    }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CatalogComponent {
  page = 1;
  showFaq = false;
  loading = false;
  products: Product[] = [
    { name: 'Vélo', description: 'Vélo de ville.' },
    { name: 'Casque', description: 'Casque homologué.' },
  ];
}

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@lion/ui/define/lion-tabs.js';
import { CatalogComponent } from './catalog/catalog.component';
import { LegacyModule } from './legacy/legacy.module';
import { RegistrationFormComponent } from './registration/registration-form.component';

@Component({
  selector: 'app-root',
  imports: [RegistrationFormComponent, CatalogComponent, LegacyModule],
  templateUrl: './app.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  selectedTab = 0;

  onTabChange(index: number): void {
    this.selectedTab = index;
  }
}

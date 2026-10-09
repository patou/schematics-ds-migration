import { Component } from '@angular/core';
import '@lion/ui/define/lion-button.js';

@Component({
  selector: 'app-legacy-banner',
  standalone: false,
  templateUrl: './legacy-banner.component.html',
})
export class LegacyBannerComponent {
  visible = true;

  close(): void {
    this.visible = false;
  }
}

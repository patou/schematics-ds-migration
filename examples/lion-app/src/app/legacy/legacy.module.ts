import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegacyBannerComponent } from './legacy-banner.component';

@NgModule({
  declarations: [LegacyBannerComponent],
  imports: [CommonModule],
  exports: [LegacyBannerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LegacyModule {}

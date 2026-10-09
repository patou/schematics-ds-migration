import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfileComponent {
  name = '';
  email = '';
  theme = 'light';
  optin = false;

  save(): void {
    console.log({ name: this.name, email: this.email, theme: this.theme, optin: this.optin });
  }

  cancel(): void {
    this.name = '';
  }
}

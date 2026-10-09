import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import '@lion/ui/define/lion-form.js';
import '@lion/ui/define/lion-fieldset.js';
import '@lion/ui/define/lion-input.js';
import '@lion/ui/define/lion-input-email.js';
import '@lion/ui/define/lion-input-tel.js';
import '@lion/ui/define/lion-input-date.js';
import '@lion/ui/define/lion-textarea.js';
import '@lion/ui/define/lion-select.js';
import '@lion/ui/define/lion-radio-group.js';
import '@lion/ui/define/lion-radio.js';
import '@lion/ui/define/lion-checkbox-group.js';
import '@lion/ui/define/lion-checkbox.js';
import '@lion/ui/define/lion-switch.js';
import '@lion/ui/define/lion-input-range.js';
import '@lion/ui/define/lion-input-file.js';
import '@lion/ui/define/lion-button-submit.js';
import '@lion/ui/define/lion-button-reset.js';

interface Registration {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  country: string;
  contact: string;
  newsletter: boolean;
  terms: boolean;
  sport: boolean;
  music: boolean;
  satisfaction: number;
  comment: string;
}

@Component({
  selector: 'app-registration-form',
  imports: [FormsModule],
  templateUrl: './registration-form.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class RegistrationFormComponent {
  model: Registration = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    country: 'fr',
    contact: 'email',
    newsletter: false,
    terms: false,
    sport: false,
    music: false,
    satisfaction: 5,
    comment: '',
  };

  countries = [
    { code: 'be', name: 'Belgique' },
    { code: 'ch', name: 'Suisse' },
  ];

  submit(): void {
    console.log('Inscription', this.model);
  }

  onFiles(event: Event): void {
    console.log('Fichiers', event);
  }
}

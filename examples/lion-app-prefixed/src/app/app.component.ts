import { Component } from '@angular/core';
import { ProfileComponent } from './profile/profile.component';

@Component({
  selector: 'app-root',
  imports: [ProfileComponent],
  template: `
    <h1>Mon profil</h1>
    <app-profile></app-profile>
  `,
})
export class AppComponent {}

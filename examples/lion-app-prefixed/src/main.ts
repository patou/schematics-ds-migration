import { bootstrapApplication } from '@angular/platform-browser';
import './lion-elements';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((err) => console.error(err));

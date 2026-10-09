/**
 * Enregistrement des composants Lion sous un préfixe applicatif (`my-lion-*`).
 */
import { LionButton, LionButtonSubmit } from '@lion/ui/button.js';
import { LionCheckbox } from '@lion/ui/checkbox-group.js';
import { LionInput } from '@lion/ui/input.js';
import { LionInputEmail } from '@lion/ui/input-email.js';
import { LionOption } from '@lion/ui/listbox.js';
import { LionSelectRich } from '@lion/ui/select-rich.js';

customElements.define('my-lion-button', class extends LionButton {});
customElements.define('my-lion-button-submit', class extends LionButtonSubmit {});
customElements.define('my-lion-checkbox', class extends LionCheckbox {});
customElements.define('my-lion-input', class extends LionInput {});
customElements.define('my-lion-input-email', class extends LionInputEmail {});
customElements.define('my-lion-option', class extends LionOption {});
customElements.define('my-lion-select-rich', class extends LionSelectRich {});

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ConnectionBanner } from '../../core/layout/connection-banner';

// shortcut: placeholder so the session-expired redirect has a target; the Login screen (frame 1) is the W2.
@Component({
  selector: 'app-login-page',
  imports: [ConnectionBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-connection-banner />
    <main class="flex flex-col items-center px-4 py-12">
      <h1 class="text-heading-lg text-primary">Entrar</h1>
    </main>
  `,
})
export class LoginPage {}

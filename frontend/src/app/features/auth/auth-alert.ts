import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Notice at the top of the login and sign-up cards: 401 "credencial inválida" and 429 "muitas tentativas". */
@Component({
  selector: 'app-auth-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="alert"
      class="flex flex-col gap-1 rounded-md border border-negative bg-negative-subtle p-3"
    >
      <p class="text-label-md text-negative">{{ heading() }}</p>
      <p class="text-body-sm text-primary">{{ text() }}</p>
    </div>
  `,
})
export class AuthAlert {
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}

/** claude/microcopy.md, section 10, "Limite de tentativas": the fields keep what was typed. */
export const TOO_MANY_ATTEMPTS = {
  heading: 'Muitas tentativas seguidas.',
  text: 'Aguarde 1 minuto e tente de novo.',
} as const;

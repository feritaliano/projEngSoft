import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../shared/ui/button';

/** Frame L "404": unknown address, including another user's resource. */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex justify-center py-12">
      <section
        class="flex w-full max-w-140 flex-col items-center gap-4 rounded-lg border border-default bg-surface p-10 text-center"
      >
        <p class="text-numeric-lg text-secondary">404</p>
        <h1 class="text-heading-lg text-primary">Página não encontrada</h1>
        <p class="text-body-md text-secondary">
          Esta página não existe ou não está disponível para a sua conta. Confira o endereço ou
          volte para as suas carteiras.
        </p>
        <a appButton routerLink="/carteiras">Ir para Carteiras</a>
      </section>
    </div>
  `,
})
export class NotFoundPage {}

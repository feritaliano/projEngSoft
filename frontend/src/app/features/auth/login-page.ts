import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ErrorHandler,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { problemOf } from '../../core/http/error.interceptor';
import {
  LOGIN_TEXTS,
  applyServerErrors,
  fieldErrorText,
  focusFirstInvalid,
} from '../../shared/forms/field-errors.pt-BR';
import { Button } from '../../shared/ui/button';
import { TextField } from '../../shared/ui/text-field';
import { AuthLayout } from './auth-layout';

/** Frame 1 (A2): default, invalid credentials, session expired (?sessao=expirada, from AuthService.expire) and loading. */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, TextField, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout
      heading="Entrar"
      lead="Acompanhe sua carteira e veja como cada número foi calculado."
    >
      @if (invalidCredentials()) {
        <div
          role="alert"
          class="flex flex-col gap-1 rounded-md border border-negative bg-negative-subtle p-3"
        >
          <p class="text-label-md text-negative">E-mail ou senha incorretos.</p>
          <p class="text-body-sm text-primary">
            Confira os dados e tente de novo. Depois de 5 tentativas, aguarde 1 minuto.
          </p>
        </div>
      } @else if (sessionExpired) {
        <div
          role="status"
          class="flex flex-col gap-1 rounded-md border border-default bg-warning-subtle p-3"
        >
          <p class="text-label-md text-warning">Sua sessão expirou.</p>
          <p class="text-body-sm text-primary">
            Entre de novo para continuar de onde parou. Nada do que você salvou foi perdido.
          </p>
        </div>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-5">
        <app-text-field
          label="E-mail"
          fieldId="email"
          type="email"
          autocomplete="email"
          [control]="form.controls.email"
          [error]="errorOf('email')"
        />
        <app-text-field
          label="Senha"
          fieldId="password"
          type="password"
          autocomplete="current-password"
          [control]="form.controls.password"
          [error]="errorOf('password')"
        />
        <button
          appButton
          type="submit"
          class="w-full md:w-auto md:self-start"
          [disabled]="loading()"
          [attr.aria-busy]="loading() ? 'true' : null"
        >
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
      <p class="text-body-sm text-secondary">
        Ainda não tem conta?
        <a
          routerLink="/cadastro"
          class="-my-3 inline-block py-3 text-label-md text-link md:-my-1 md:py-1"
          >Criar conta</a
        >
      </p>
    </app-auth-layout>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorHandler);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly sessionExpired =
    inject(ActivatedRoute).snapshot.queryParamMap.get('sessao') === 'expirada';
  protected readonly loading = signal(false);
  protected readonly invalidCredentials = signal(false);

  protected errorOf(field: keyof typeof LOGIN_TEXTS): string | null {
    return fieldErrorText(LOGIN_TEXTS[field], this.form.controls[field]);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return this.focusInvalid();

    const body = this.form.getRawValue();
    this.invalidCredentials.set(false);
    this.loading.set(true);
    this.form.disable();
    this.auth.login(body).subscribe({
      next: () => void this.router.navigateByUrl('/carteiras'),
      error: (error: unknown) => {
        this.loading.set(false);
        this.form.enable();
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // Frame "credencial inválida": the e-mail stays, the password is cleared and focused.
          this.invalidCredentials.set(true);
          this.form.controls.password.reset();
          this.host.querySelector<HTMLElement>('#password')?.focus();
        } else if (applyServerErrors(this.form, problemOf(error))) {
          this.focusInvalid();
        } else if (!(error instanceof HttpErrorResponse && error.status === 0)) {
          // Status 0 shows the connection banner. 429 and 5xx have no text in the microcopy yet (pending with UX).
          this.errors.handleError(error);
        }
      },
    });
  }

  private focusInvalid(): void {
    afterNextRender(() => focusFirstInvalid(this.host), { injector: this.injector });
  }
}

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
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { problemOf } from '../../core/http/error.interceptor';
import {
  PASSWORD_MIN_LENGTH,
  REGISTER_TEXTS,
  applyServerErrors,
  fieldErrorText,
  focusFirstInvalid,
} from '../../shared/forms/field-errors.pt-BR';
import { Button } from '../../shared/ui/button';
import { TextField } from '../../shared/ui/text-field';
import { AuthLayout } from './auth-layout';

/** Frame 2 (A1, RN01): default, field error (400/409 by field + code, D56) and loading; the new account enters signed in. */
@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, TextField, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout heading="Criar conta" lead="Gratuita. Seus dados ficam só na sua conta.">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-5">
        <app-text-field
          label="Nome"
          fieldId="name"
          autocomplete="name"
          [control]="form.controls.name"
          [error]="errorOf('name')"
        />
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
          autocomplete="new-password"
          helper="Mínimo de 8 caracteres."
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
          {{ loading() ? 'Criando conta…' : 'Criar conta' }}
        </button>
      </form>
      <p class="text-body-sm text-secondary">
        Já tem conta?
        <a
          routerLink="/entrar"
          class="-my-3 inline-block py-3 text-label-md text-link md:-my-1 md:py-1"
          >Entrar</a
        >
      </p>
    </app-auth-layout>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorHandler);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  // RN01 checked here only for convenience; the API validates again and its 400 wins.
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
  });
  protected readonly loading = signal(false);

  protected errorOf(field: keyof typeof REGISTER_TEXTS): string | null {
    return fieldErrorText(REGISTER_TEXTS[field], this.form.controls[field], {
      min: PASSWORD_MIN_LENGTH,
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return this.focusInvalid();

    const body = this.form.getRawValue();
    this.loading.set(true);
    this.form.disable();
    this.auth.register(body).subscribe({
      next: () => void this.router.navigateByUrl('/carteiras'),
      error: (error: unknown) => {
        this.loading.set(false);
        this.form.enable();
        if (applyServerErrors(this.form, problemOf(error))) {
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

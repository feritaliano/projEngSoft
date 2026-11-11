import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** S1 navigation only (D41): later stages add their items when delivered. */
const NAV_ITEMS = [
  { path: '/carteiras', label: 'Carteiras' },
  { path: '/ativos', label: 'Ativos' },
] as const;

/** Figma "AppHeader" (frame L): Desktop with user menu, Mobile with a sheet holding the same items. */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeMenus(true)',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <header class="relative z-20 border-b border-default bg-surface">
      <div class="flex h-14 items-center gap-8 px-4 md:h-16 md:px-8">
        <a
          routerLink="/carteiras"
          class="flex min-h-11 items-center gap-2 rounded-md md:min-h-0"
          (click)="closeMenus()"
        >
          <span
            aria-hidden="true"
            class="flex size-7 items-center justify-center rounded-md bg-primary text-label-sm text-on-primary"
            >B3</span
          >
          <span class="text-heading-sm text-primary">Carteira B3</span>
        </a>

        <nav aria-label="Principal" class="hidden gap-1 md:flex">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive
              ariaCurrentWhenActive="page"
              class="rounded-md px-3 py-2 text-label-md text-secondary transition-colors duration-150 ease-out hover:bg-subtle current:bg-primary-subtle current:text-link"
              >{{ item.label }}</a
            >
          }
        </nav>

        <div class="ml-auto flex items-center">
          @if (auth.user(); as user) {
            <div class="relative hidden md:block">
              <button
                #userButton
                type="button"
                class="flex items-center gap-2 rounded-md border border-default px-3 py-2 text-label-md text-primary transition-colors duration-150 ease-out hover:bg-subtle"
                aria-controls="user-menu"
                [attr.aria-expanded]="userMenuOpen()"
                (click)="userMenuOpen.set(!userMenuOpen())"
              >
                {{ user.name }} <span aria-hidden="true">▾</span>
              </button>
              @if (userMenuOpen()) {
                <div
                  id="user-menu"
                  class="absolute right-0 top-full mt-2 flex w-60 flex-col gap-1 rounded-md border border-default bg-surface p-2 shadow-overlay"
                >
                  <div class="flex flex-col gap-1 px-3 py-2">
                    <span class="truncate text-label-md text-primary">{{ user.name }}</span>
                    <span class="truncate text-caption text-secondary">{{ user.email }}</span>
                  </div>
                  <button
                    type="button"
                    class="rounded-sm px-3 py-2 text-left text-label-md text-negative hover:bg-subtle"
                    (click)="auth.logout()"
                  >
                    Sair
                  </button>
                </div>
              }
            </div>
          }

          <button
            #mobileButton
            type="button"
            class="flex h-11 items-center gap-2 rounded-md border border-default px-3 text-label-md text-primary md:hidden"
            aria-controls="mobile-menu"
            [attr.aria-expanded]="mobileMenuOpen()"
            (click)="mobileMenuOpen.set(!mobileMenuOpen())"
          >
            Menu <span aria-hidden="true">☰</span>
          </button>
        </div>
      </div>

      @if (mobileMenuOpen()) {
        <div
          aria-hidden="true"
          class="fixed inset-x-0 bottom-0 top-14 bg-scrim/55 md:hidden"
          (click)="closeMenus()"
        ></div>
        <div
          id="mobile-menu"
          class="absolute inset-x-0 top-full flex flex-col gap-1 bg-surface p-4 md:hidden"
        >
          <nav aria-label="Principal" class="flex flex-col gap-1">
            @for (item of navItems; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive
                ariaCurrentWhenActive="page"
                class="rounded-md p-3 text-label-md text-primary current:bg-primary-subtle current:text-link"
                (click)="closeMenus()"
                >{{ item.label }}</a
              >
            }
          </nav>
          @if (auth.user(); as user) {
            <hr class="border-default" />
            <div class="flex flex-col gap-1 p-3">
              <span class="text-label-md text-primary">{{ user.name }}</span>
              <span class="text-caption text-secondary">{{ user.email }}</span>
            </div>
            <button
              type="button"
              class="rounded-md p-3 text-left text-label-md text-negative"
              (click)="auth.logout()"
            >
              Sair
            </button>
          }
        </div>
      }
    </header>
  `,
})
export class AppHeader {
  protected readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly userButton = viewChild<ElementRef<HTMLButtonElement>>('userButton');
  private readonly mobileButton = viewChild<ElementRef<HTMLButtonElement>>('mobileButton');

  protected readonly navItems = NAV_ITEMS;
  protected readonly userMenuOpen = signal(false);
  protected readonly mobileMenuOpen = signal(false);

  /** Esc closes and returns the focus to the button that opened the menu. */
  protected closeMenus(returnFocus = false): void {
    let opener: ElementRef<HTMLButtonElement> | undefined;
    if (this.userMenuOpen()) opener = this.userButton();
    else if (this.mobileMenuOpen()) opener = this.mobileButton();
    this.userMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
    if (returnFocus) opener?.nativeElement.focus();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closeMenus();
  }
}

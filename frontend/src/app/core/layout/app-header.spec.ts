import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AuthService } from '../auth/auth.service';
import { AppHeader } from './app-header';

@Component({ template: '' })
class Blank {}

describe('AppHeader', () => {
  let fixture: ComponentFixture<AppHeader>;
  let auth: AuthService;
  let el: HTMLElement;

  const signIn = () =>
    auth.start({
      accessToken: 't1',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'u1', name: 'Ana Lima', email: 'ana.lima@email.com' },
    });
  const button = (name: string) =>
    [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(name),
    ) as HTMLButtonElement;
  const render = async () => {
    fixture = TestBed.createComponent(AppHeader);
    el = fixture.nativeElement;
    await fixture.whenStable();
  };
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://api.test'),
        provideRouter([
          { path: 'carteiras', component: Blank },
          { path: 'ativos', component: Blank },
        ]),
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('has a main navigation with only the S1 items: Carteiras and Ativos', async () => {
    await render();

    const nav = el.querySelector('nav[aria-label="Principal"]');
    const links = [...(nav?.querySelectorAll('a') ?? [])].map((a) => [
      a.textContent,
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Carteiras', '/carteiras'],
      ['Ativos', '/ativos'],
    ]);
  });

  it('marks the current page with aria-current', async () => {
    await TestBed.inject(Router).navigateByUrl('/ativos');
    await render();

    const current = el.querySelectorAll('nav[aria-label="Principal"] a[aria-current="page"]');
    expect([...current].map((a) => a.textContent)).toEqual(['Ativos']);
  });

  it('has no user menu when signed out', async () => {
    await render();

    expect(el.querySelector('[aria-controls="user-menu"]')).toBeNull();
  });

  it('opens the user menu with name, e-mail and Sair, and Sair signs out', async () => {
    signIn();
    const logout = vi.spyOn(auth, 'logout').mockImplementation(() => undefined);
    await render();

    const toggle = button('Ana Lima');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await settle();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const menu = el.querySelector('#user-menu');
    expect(menu?.textContent).toContain('ana.lima@email.com');
    (menu?.querySelector('button') as HTMLButtonElement).click();
    expect(logout).toHaveBeenCalled();
  });

  it('Esc closes the user menu and returns the focus to its button', async () => {
    signIn();
    await render();
    const toggle = button('Ana Lima');
    toggle.click();
    await settle();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();

    expect(el.querySelector('#user-menu')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('a click outside closes the user menu', async () => {
    signIn();
    await render();
    button('Ana Lima').click();
    await settle();

    document.body.click();
    await settle();

    expect(el.querySelector('#user-menu')).toBeNull();
  });

  it('the mobile menu opens a sheet with the same items and closes on navigation', async () => {
    signIn();
    await render();
    const toggle = button('Menu');

    toggle.click();
    await settle();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const sheet = el.querySelector('#mobile-menu') as HTMLElement;
    expect([...sheet.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Carteiras',
      'Ativos',
    ]);
    expect(sheet.textContent).toContain('Sair');

    (sheet.querySelector('nav a') as HTMLAnchorElement).click();
    await settle();
    expect(el.querySelector('#mobile-menu')).toBeNull();
  });

  it('Esc closes the mobile menu and returns the focus to its button', async () => {
    await render();
    const toggle = button('Menu');
    toggle.click();
    await settle();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();

    expect(el.querySelector('#mobile-menu')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});

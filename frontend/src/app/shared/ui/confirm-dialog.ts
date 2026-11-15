import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Button } from './button';
import { TextField } from './text-field';

/**
 * ConfirmDialog (C3): every destructive or recalculating action goes through it. Opens as a modal <dialog> when
 * rendered (the browser traps the focus and makes the page inert); Esc and "Cancelar" emit `cancelled`, and the
 * parent removes it. With `typeToConfirm`, the confirm button only enables when the typed text equals it (spaces at
 * the ends ignored) and the field takes the first focus; otherwise "Cancelar" does. Enter never confirms: there is
 * no form. On close, the focus goes back to the element that opened it, when it still exists.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-text"
      class="m-auto w-11/12 max-w-110 rounded-xl bg-surface p-6 text-primary shadow-overlay backdrop:bg-scrim/55"
      (cancel)="$event.preventDefault(); cancelled.emit()"
    >
      <div class="flex flex-col gap-4">
        <h2 id="confirm-dialog-title" class="text-heading-md text-primary">{{ heading() }}</h2>
        <p id="confirm-dialog-text" class="text-body-md text-secondary">{{ text() }}</p>
        @if (typeToConfirm()) {
          <app-text-field
            [label]="typeToConfirmLabel()"
            fieldId="confirm-dialog-input"
            autocomplete="off"
            [control]="typed"
          />
        }
        <div class="flex flex-wrap justify-end gap-3">
          <button #cancel appButton variant="secondary" type="button" (click)="cancelled.emit()">
            Cancelar
          </button>
          <button
            appButton
            type="button"
            [variant]="variant()"
            [disabled]="!canConfirm() || busy()"
            [attr.aria-busy]="busy() ? 'true' : null"
            (click)="confirmed.emit()"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class ConfirmDialog {
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly variant = input<'danger' | 'primary'>('danger');
  readonly typeToConfirm = input<string | null>(null);
  readonly typeToConfirmLabel = input('');
  readonly busy = input(false);

  readonly confirmed = output();
  readonly cancelled = output();

  protected readonly typed = new FormControl('', { nonNullable: true });
  private readonly typedValue = toSignal(this.typed.valueChanges, { initialValue: '' });
  protected readonly canConfirm = computed(() => {
    const expected = this.typeToConfirm();
    return expected === null || this.typedValue().trim() === expected;
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancel = viewChild.required<ElementRef<HTMLButtonElement>>('cancel');

  constructor() {
    const opener = document.activeElement as HTMLElement | null;
    const host: HTMLElement = inject(ElementRef).nativeElement;
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      (
        host.querySelector<HTMLElement>('#confirm-dialog-input') ?? this.cancel().nativeElement
      ).focus();
    });
    inject(DestroyRef).onDestroy(() => {
      this.dialog().nativeElement.close();
      if (opener?.isConnected) opener.focus();
    });
  }
}

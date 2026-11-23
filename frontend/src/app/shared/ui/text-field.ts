import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * TextField of the design system (Figma "TextField"): label always visible, helper or error below the input,
 * linked by aria-describedby; the error also sets aria-invalid and the error border (handoff U5).
 */
@Component({
  selector: 'app-text-field',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-1' },
  template: `
    <label [for]="fieldId()" class="text-label-md text-primary">{{ label() }}</label>
    <input
      [id]="fieldId()"
      [type]="type()"
      [attr.autocomplete]="autocomplete()"
      [attr.placeholder]="placeholder()"
      [attr.maxlength]="maxLength()"
      [attr.max]="max()"
      [attr.inputmode]="inputMode()"
      [formControl]="control()"
      [attr.aria-invalid]="error() ? 'true' : null"
      [attr.aria-describedby]="hint() ? hintId() : null"
      class="h-11 w-full rounded-md bg-surface px-3 py-2 text-body-md text-primary placeholder:text-secondary disabled:bg-subtle disabled:text-secondary"
      [class]="error() ? 'border-2 border-negative' : 'border border-strong'"
    />
    @if (hint(); as text) {
      <p
        [id]="hintId()"
        class="text-caption"
        [class]="error() ? 'text-negative' : 'text-secondary'"
      >
        {{ text }}
      </p>
    }
  `,
})
export class TextField {
  readonly label = input.required<string>();
  readonly fieldId = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly type = input('text');
  readonly autocomplete = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  /** Limit of the API for the field, so the browser stops the typing instead of a 400. */
  readonly maxLength = input<number | null>(null);
  /** Latest date of a date field (YYYY-MM-DD). */
  readonly max = input<string | null>(null);
  /** Keyboard on touch screens, e.g. "decimal". */
  readonly inputMode = input<string | null>(null);
  readonly helper = input<string | null>(null);
  readonly error = input<string | null>(null);

  protected readonly hint = computed(() => this.error() ?? this.helper());
  protected readonly hintId = computed(() => `${this.fieldId()}-hint`);
}

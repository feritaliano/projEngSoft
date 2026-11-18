import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AssetType } from '../../api/models';
import { ASSET_TYPE, assetName } from '../assets/asset-type';

/**
 * AssetAvatar of the design system (D45): first two letters of the ticker (of the display name when there is none)
 * and the border in the color of the class. Decorative: the name of the asset is always next to it.
 */
@Component({
  selector: 'app-asset-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class:
      'flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-subtle text-label-sm text-primary',
    '[class]': 'border()',
  },
  template: `{{ letters() }}`,
})
export class AssetAvatar {
  readonly asset = input.required<{
    ticker: string | null;
    displayName: string;
    assetType: AssetType;
  }>();

  protected readonly letters = computed(() => assetName(this.asset()).slice(0, 2).toUpperCase());
  protected readonly border = computed(() => ASSET_TYPE[this.asset().assetType].border);
}

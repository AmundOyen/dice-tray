import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { DIE_SIDES, DieType, MAX_DICE_PER_TYPE } from '../dice';

/** A card for one die type: tap the die to add one, or use the +/- buttons. */
@Component({
  selector: 'app-die-selector',
  imports: [MatIconButton, MatIcon, MatTooltip],
  templateUrl: './die-selector.html',
  styleUrl: './die-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.selected]': 'count() > 0',
    '[attr.data-die]': 'die()',
  },
})
export class DieSelector {
  readonly die = input.required<DieType>();
  readonly count = input.required<number>();
  readonly countChange = output<number>();

  protected readonly sides = computed(() => DIE_SIDES[this.die()]);
  protected readonly atMax = computed(() => this.count() >= MAX_DICE_PER_TYPE);

  protected increment(): void {
    if (!this.atMax()) this.countChange.emit(this.count() + 1);
  }

  protected decrement(): void {
    if (this.count() > 0) this.countChange.emit(this.count() - 1);
  }

  protected clear(): void {
    if (this.count() > 0) this.countChange.emit(0);
  }
}

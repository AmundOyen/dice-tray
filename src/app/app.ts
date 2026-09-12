import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import {
  DIE_SIDES,
  DIE_TYPES,
  DicePool,
  DieType,
  MAX_DICE_PER_TYPE,
  RollResult,
  emptyPool,
  formatPool,
  poolSize,
  rollPool,
} from './dice';
import { DieSelector } from './die-selector/die-selector';

const STORAGE_KEY = 'dice-tray.state.v1';
const HISTORY_LIMIT = 30;
const ROLL_ANIMATION_MS = 400;

interface PersistedState {
  pool: DicePool;
  modifier: number;
  history: RollResult[];
}

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    MatToolbar,
    MatButton,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    MatTooltip,
    DieSelector,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly dieTypes = DIE_TYPES;
  protected readonly maxPerType = MAX_DICE_PER_TYPE;

  protected readonly pool = signal<DicePool>(emptyPool());
  protected readonly modifier = signal(0);
  protected readonly history = signal<RollResult[]>([]);
  protected readonly rolling = signal(false);

  protected readonly diceCount = computed(() => poolSize(this.pool()));
  protected readonly formula = computed(() => formatPool(this.pool(), this.modifier()));
  protected readonly canRoll = computed(() => this.diceCount() > 0 && !this.rolling());
  protected readonly latest = computed(() => this.history()[0] ?? null);
  protected readonly previous = computed(() => this.history().slice(1));

  private nextId = 1;

  constructor() {
    this.restore();
    effect(() => this.persist());
  }

  protected setCount(die: DieType, count: number): void {
    const clamped = Math.max(0, Math.min(MAX_DICE_PER_TYPE, Math.trunc(count)));
    this.pool.update((pool) => ({ ...pool, [die]: clamped }));
  }

  protected setModifier(value: number | string | null): void {
    const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
    this.modifier.set(Number.isFinite(parsed) ? Math.max(-999, Math.min(999, parsed)) : 0);
  }

  protected nudgeModifier(delta: number): void {
    this.setModifier(this.modifier() + delta);
  }

  protected clearSelection(): void {
    this.pool.set(emptyPool());
    this.modifier.set(0);
  }

  protected clearHistory(): void {
    this.history.set([]);
  }

  protected roll(): void {
    if (!this.canRoll()) return;
    this.rollWith(this.pool(), this.modifier());
  }

  /** Re-roll a previous result using the same dice, and restore that selection. */
  protected reroll(result: RollResult): void {
    if (this.rolling()) return;
    this.pool.set({ ...result.pool });
    this.modifier.set(result.modifier);
    this.rollWith(result.pool, result.modifier);
  }

  protected formatResult(result: RollResult): string {
    return formatPool(result.pool, result.modifier);
  }

  protected isMax(die: DieType, value: number): boolean {
    return value === DIE_SIDES[die];
  }

  protected isMin(value: number): boolean {
    return value === 1;
  }

  protected trackResult(_index: number, result: RollResult): number {
    return result.id;
  }

  private rollWith(pool: DicePool, modifier: number): void {
    const result: RollResult = {
      id: this.nextId++,
      timestamp: Date.now(),
      ...rollPool(pool, modifier),
    };
    this.rolling.set(true);
    // Brief delay so the roll button and result can animate before the numbers appear.
    setTimeout(() => {
      this.history.update((history) => [result, ...history].slice(0, HISTORY_LIMIT));
      this.rolling.set(false);
    }, ROLL_ANIMATION_MS);
  }

  private restore(): void {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as Partial<PersistedState>;
      if (state.pool) {
        const pool = emptyPool();
        for (const die of DIE_TYPES) {
          const count = Number(state.pool[die]);
          pool[die] = Number.isFinite(count) ? Math.max(0, Math.min(MAX_DICE_PER_TYPE, count)) : 0;
        }
        this.pool.set(pool);
      }
      if (typeof state.modifier === 'number') this.modifier.set(state.modifier);
      if (Array.isArray(state.history)) {
        this.history.set(state.history.slice(0, HISTORY_LIMIT));
        this.nextId = Math.max(0, ...state.history.map((r) => r.id)) + 1;
      }
    } catch {
      // Ignore corrupt or unavailable storage; start fresh.
    }
  }

  private persist(): void {
    const state: PersistedState = {
      pool: this.pool(),
      modifier: this.modifier(),
      history: this.history(),
    };
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be full or blocked (private mode); the app works without it.
    }
  }
}

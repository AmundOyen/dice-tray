import { Injectable, signal } from '@angular/core';
import type DiceBox from '@3d-dice/dice-box';
import { DIE_TYPES, DicePool, DieGroupResult, DieType, RollResult, rollPool } from './dice';

export type RollerStatus = 'idle' | 'loading' | 'ready' | 'fallback';

/** Time to wait for the 3D engine and its assets before giving up and rolling in software. */
const INIT_TIMEOUT_MS = 20_000;
const ROLL_TIMEOUT_MS = 30_000;

/** Dice colour: a muted sage green, light enough to stand out from the darker felt. */
const DICE_COLOR = '#bccfb4';

/**
 * Rolls dice in the 3D tray from @3d-dice/dice-box, and falls back to the
 * plain random-number roller when WebGL or the assets are unavailable.
 */
@Injectable({ providedIn: 'root' })
export class DiceRoller {
  readonly status = signal<RollerStatus>('idle');

  private box: DiceBox | null = null;
  private initPromise: Promise<void> | null = null;

  /** Loads the 3D engine into `host`. Safe to call once per app lifetime. */
  attach(host: HTMLElement): Promise<void> {
    this.initPromise ??= this.initialize(host);
    return this.initPromise;
  }

  async roll(pool: DicePool, modifier: number): Promise<Omit<RollResult, 'id' | 'timestamp'>> {
    if (this.initPromise) await this.initPromise;
    const box = this.box;
    if (!box || this.status() !== 'ready') return rollPool(pool, modifier);

    const notation = DIE_TYPES.filter((die) => pool[die] > 0).map((die) => `${pool[die]}${die}`);
    try {
      await withTimeout(box.roll(notation), ROLL_TIMEOUT_MS, 'The 3D roll did not settle in time.');
      const groups = this.collectGroups(box.getRollResults(), pool);
      const total = groups.reduce((sum, g) => sum + g.subtotal, 0) + modifier;
      return { pool: { ...pool }, modifier, groups, total };
    } catch (error) {
      console.warn('3D roll failed; rolling in software instead.', error);
      return rollPool(pool, modifier);
    }
  }

  clear(): void {
    this.box?.clear();
  }

  private async initialize(host: HTMLElement): Promise<void> {
    this.status.set('loading');
    if (!host.id) host.id = 'dice-tray-3d';
    try {
      const { default: DiceBoxCtor } = await import('@3d-dice/dice-box');
      const box = new DiceBoxCtor({
        container: `#${host.id}`,
        assetPath: assetPath(),
        theme: 'default',
        themeColor: DICE_COLOR,
        scale: 6,
        enableShadows: true,
        shadowTransparency: 0.7,
        lightIntensity: 0.9,
        throwForce: 6,
        spinForce: 5,
      });
      await withTimeout(box.init(), INIT_TIMEOUT_MS, 'The 3D dice engine took too long to load.');
      this.box = box;
      this.status.set('ready');
    } catch (error) {
      console.warn('3D dice unavailable; rolling in software instead.', error);
      this.status.set('fallback');
    }
  }

  /**
   * Maps dice-box's grouped results back onto the app's die types. If the
   * engine returns something unexpected for a group, that group is re-rolled
   * in software so the total always matches the requested pool.
   */
  private collectGroups(
    results: ReturnType<DiceBox['getRollResults']>,
    pool: DicePool,
  ): DieGroupResult[] {
    const bySides = new Map<string, number[]>();
    for (const group of results) {
      const key = normalizeSides(group.sides);
      const values = group.rolls.map((r) => r.value).filter((v) => Number.isFinite(v));
      bySides.set(key, [...(bySides.get(key) ?? []), ...values]);
    }
    const groups: DieGroupResult[] = [];
    for (const die of DIE_TYPES) {
      const count = pool[die];
      if (count <= 0) continue;
      let rolls = bySides.get(die) ?? [];
      if (rolls.length !== count) {
        const fallback = rollPool({ ...emptyLike(pool), [die]: count } as DicePool, 0);
        rolls = fallback.groups[0]?.rolls ?? [];
      }
      groups.push({ die, rolls, subtotal: rolls.reduce((a, b) => a + b, 0) });
    }
    return groups;
  }
}

function emptyLike(pool: DicePool): DicePool {
  const empty = { ...pool };
  for (const die of DIE_TYPES) empty[die] = 0;
  return empty;
}

function normalizeSides(sides: string | number): DieType | string {
  const text = String(sides).toLowerCase();
  return text.startsWith('d') ? text : `d${text}`;
}

/** Dice-box resolves `assetPath` against the page origin, so include the app's base href. */
function assetPath(): string {
  return new URL('assets/dice-box/', document.baseURI).pathname;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { DicePool, RollResult, rollPool } from './dice';
import { DiceRoller } from './dice-roller';

/** Rolls in software immediately; the 3D engine needs WebGL, which jsdom lacks. */
class FakeDiceRoller {
  readonly status = () => 'fallback' as const;
  attach = async () => {};
  clear = () => {};
  roll = async (pool: DicePool, modifier: number): Promise<Omit<RollResult, 'id' | 'timestamp'>> =>
    rollPool(pool, modifier, () => 0.5);
}

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), { provide: DiceRoller, useClass: FakeDiceRoller }],
    }).compileComponents();
  });

  it('renders the title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.title')?.textContent).toContain('Dice Tray');
  });

  it('offers every die type in the picker sidenav', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('mat-sidenav app-die-selector').length).toBe(7);
  });

  it('disables the roll button until a die is selected', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const rollButton = compiled.querySelector<HTMLButtonElement>('.roll-button')!;
    expect(rollButton.disabled).toBe(true);

    compiled.querySelector<HTMLButtonElement>('app-die-selector[data-die="d20"] .die')!.click();
    await fixture.whenStable();

    expect(rollButton.disabled).toBe(false);
    expect(rollButton.textContent).toContain('Roll 1d20');
  });

  it('shows the result after rolling', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('app-die-selector[data-die="d6"] .die')!.click();
    compiled.querySelector<HTMLButtonElement>('app-die-selector[data-die="d6"] .die')!.click();
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.roll-button')!.click();
    await fixture.whenStable();

    expect(compiled.querySelector('.result-formula')?.textContent).toContain('2d6');
    expect(compiled.querySelector('.result-total')?.textContent?.trim()).toBe('8');
  });
});

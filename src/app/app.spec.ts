import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renders the title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.title')?.textContent).toContain('Dice Tray');
  });

  it('offers every die type', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('app-die-selector').length).toBe(7);
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
});

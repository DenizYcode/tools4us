// The shortlist in the browser: one place that reads and writes the saved list, keeps every "add" button and the
// header count in step, and announces changes. Loaded by the header, so it runs on every page. Pure rules live in
// src/lib/shortlist.mjs (tested); this file only connects them to localStorage and the page.
import { loadList, saveList, toggleItem, hasItem, MAX_ITEMS } from '../lib/shortlist.mjs';

export interface Item {
  f: string;
  s: string;
  c?: string;
}

const EVENT = 't4u:shortlist';
// When the browser blocks storage the list still works until the page is closed.
let fallback: Item[] | null = null;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getList(): Item[] {
  const s = storage();
  return fallback ?? (s ? (loadList(s) as Item[]) : []);
}

export function setList(list: Item[]): boolean {
  const s = storage();
  if (s && saveList(s, list)) {
    fallback = null;
  } else {
    fallback = list;
  }
  window.dispatchEvent(new CustomEvent(EVENT));
  return fallback === null;
}

const text = (name: string) => document.body.dataset[name] ?? '';
const fill = (template: string, vars: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

function announce(message: string) {
  const live = document.getElementById('sl-live');
  if (live) live.textContent = message;
}

/** Adds or removes a model; tells the reader what happened. Returns whether the item is now on the list. */
export function toggle(item: Item, name: string): boolean {
  const result = toggleItem(getList(), item) as { list: Item[]; on: boolean; ok: boolean };
  if (!result.ok) {
    announce(fill(text('slFull'), { n: MAX_ITEMS }));
    return hasItem(getList(), item);
  }
  const saved = setList(result.list);
  announce(`${fill(text(result.on ? 'slAdded' : 'slRemoved'), { name })}${saved ? '' : ` ${text('slSaveFailed')}`}`);
  return result.on;
}

const itemOf = (button: HTMLElement): Item => ({ f: button.dataset.slF ?? '', s: button.dataset.slS ?? '', ...(button.dataset.slC ? { c: button.dataset.slC } : {}) });

/** Brings every add button and the header count in line with the saved list. */
export function refresh(root: ParentNode = document): void {
  const list = getList();
  for (const button of root.querySelectorAll<HTMLButtonElement>('button.sl-btn')) {
    const on = hasItem(list, itemOf(button));
    const name = button.dataset.slName ?? '';
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', fill(text(on ? 'slRemoveFor' : 'slAddFor'), { name }));
    const label = button.querySelector('.sl-text');
    if (label) label.textContent = on ? text('slIn') : (button.dataset.slAddLabel ?? text('slAdd'));
    const mark = button.querySelector('.sl-mark');
    if (mark) mark.textContent = on ? '✓' : '+';
  }
  for (const count of document.querySelectorAll<HTMLElement>('span[data-sl-count]')) {
    count.textContent = list.length ? String(list.length) : '';
    count.hidden = list.length === 0;
  }
  for (const link of document.querySelectorAll<HTMLElement>('a.sl-link')) {
    link.setAttribute('aria-label', list.length ? `${text('slLink')}: ${fill(text('slCounted'), { n: list.length })}` : text('slLink'));
  }
}

/** A button for models drawn by script (selector results, compare columns). The caller appends it. */
export function makeButton(item: Item, name: string, current = true, addLabel?: string): HTMLButtonElement | null {
  if (!current) return null; // an End-of-Sale model is never offered for the shortlist
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sl-btn';
  button.dataset.slF = item.f;
  button.dataset.slS = item.s;
  if (item.c) button.dataset.slC = item.c;
  button.dataset.slName = name;
  if (addLabel) button.dataset.slAddLabel = addLabel;
  const mark = document.createElement('span');
  mark.className = 'sl-mark';
  mark.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'sl-text';
  button.append(mark, label);
  const on = hasItem(getList(), item);
  mark.textContent = on ? '✓' : '+';
  label.textContent = on ? text('slIn') : (addLabel ?? text('slAdd'));
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', fill(text(on ? 'slRemoveFor' : 'slAddFor'), { name }));
  return button;
}

if (!(window as unknown as { __t4uShortlist?: boolean }).__t4uShortlist) {
  (window as unknown as { __t4uShortlist?: boolean }).__t4uShortlist = true;
  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button.sl-btn');
    if (!button) return;
    toggle(itemOf(button), button.dataset.slName ?? '');
    document.dispatchEvent(new CustomEvent('t4u:track', { detail: { event: hasItem(getList(), itemOf(button)) ? 'shortlist-add' : 'shortlist-remove' } }));
  });
  window.addEventListener(EVENT, () => refresh());
  window.addEventListener('storage', () => refresh());
  // Coming back with the back button restores the page from memory; the list may have changed meanwhile.
  window.addEventListener('pageshow', () => refresh());
  refresh();
}

// Page views and a few named events with GoatCounter (cookieless). Nothing is loaded when the browser asks not to be
// tracked. The vendored count.js is told not to count on its own (no_onload) and not to bind events (no_events), and
// every request is cut down first: no query string, no referrer path of another site, event names from a fixed list
// (src/lib/track.mjs). The script file and the one address it may talk to are checked by `npm run check:dist`.
import { cleanPath, cleanReferrer, doNotTrack, isEvent } from '../lib/track.mjs';

interface GoatCounter {
  no_onload?: boolean;
  no_events?: boolean;
  path?: (path: string) => string;
  referrer?: (referrer: string) => string;
  get_data?: (vars?: Record<string, unknown>) => Record<string, unknown>;
  count?: (vars?: Record<string, unknown>) => void;
}

const w = window as unknown as { goatcounter?: GoatCounter; __t4uTrack?: boolean };

if (!w.__t4uTrack) {
  w.__t4uTrack = true;
  const { gcEndpoint, gcSrc } = document.body.dataset;
  const queue: string[] = [];
  let ready = false;

  const send = (name: string) => {
    try {
      w.goatcounter?.count?.({ event: true, path: name, title: name });
    } catch {
      /* analytics must never break the page */
    }
  };

  document.addEventListener('t4u:track', (event) => {
    const name = (event as CustomEvent<{ event?: string }>).detail?.event ?? '';
    if (!isEvent(name)) return;
    if (ready) send(name);
    else queue.push(name);
  });

  // Links and buttons marked data-track="<event>" report that event when they are used (also middle click).
  const onUse = (event: Event) => {
    const element = (event.target as HTMLElement).closest<HTMLElement>('[data-track]');
    const name = element?.dataset.track ?? '';
    if (isEvent(name)) document.dispatchEvent(new CustomEvent('t4u:track', { detail: { event: name } }));
  };
  document.addEventListener('click', onUse);
  document.addEventListener('auxclick', onUse);

  if (gcEndpoint && gcSrc && !doNotTrack(navigator as unknown as Record<string, unknown>, window as unknown as Record<string, unknown>)) {
    w.goatcounter = {
      no_onload: true,
      no_events: true,
      path: cleanPath,
      referrer: (r) => cleanReferrer(r, location.origin),
    };
    const script = document.createElement('script');
    script.async = true;
    script.src = gcSrc;
    script.dataset.goatcounter = gcEndpoint;
    script.addEventListener('load', () => {
      const gc = w.goatcounter;
      if (!gc?.get_data || !gc.count) return;
      // count.js always adds the query string ("q"); it can hold a search or a shared list, so it is removed here.
      const original = gc.get_data.bind(gc);
      gc.get_data = (vars) => {
        const data = original(vars);
        delete data.q;
        return data;
      };
      // count.js reads localStorage; where that throws, analytics stops but nothing else does.
      try {
        gc.count();
      } catch {
        /* blocked storage */
      }
      ready = true;
      for (const name of queue.splice(0)) send(name);
    });
    document.head.append(script);
  }
}

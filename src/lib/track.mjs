// Analytics rules (SPEC "Analytics"), kept free of the DOM so they can be tested. The site counts page views and a few
// named events with GoatCounter, which sets no cookie. What is sent is cut down on purpose: no query string (it holds
// what the visitor searched for or the shortlist), no path of a same-site referrer's query, and only event names from
// the list below, so a stray dispatch can never carry text to the counter.

/** The only events the site reports. Each is a name, never data. */
export const EVENTS = [
  'search-zero', // a search with no result: tells the owner what to add or write next
  'selector-complete', // the guided selector gave an answer
  'story-click', // a story card or link was opened
  'model-select', // a model page was opened from a family list
  'datasheet-click', // a Cisco datasheet link was opened
  'filter-open', // the filter sheet was opened on a phone
  'shortlist-add',
  'shortlist-remove',
  'export-print',
  'export-csv',
  'export-link',
  'form-sent',
  'migration-found',
  'migration-miss',
  'migration-current',
];

export const isEvent = (name) => EVENTS.includes(name);

/** The path of a page without its query string or fragment: "/tr/ara/?q=isik" -> "/tr/ara/". */
export function cleanPath(path) {
  return String(path ?? '').split('#')[0].split('?')[0] || '/';
}

/** A same-site referrer keeps only its path; another site keeps only its origin. Anything unreadable is dropped. */
export function cleanReferrer(referrer, origin) {
  if (!referrer) return '';
  try {
    const url = new URL(referrer);
    return url.origin === origin ? url.pathname : url.origin;
  } catch {
    return '';
  }
}

/** True when the browser asks not to be tracked (Do Not Track, or Global Privacy Control). Then nothing is loaded. */
export function doNotTrack(nav = {}, win = {}) {
  return nav.doNotTrack === '1' || nav.doNotTrack === 'yes' || win.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true;
}

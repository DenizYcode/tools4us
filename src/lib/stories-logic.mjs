// Pure story logic: which stories the hub strip shows, which are fresh, which mention a model.
// The data check already refuses a featured story past review_by; the strip repeats that rule so a page
// built later than the check never shows a stale story (SPEC "Freshness rules").

export const CATEGORY_ORDER = ['new', 'licence', 'security', 'family', 'event'];

/** True while review_by has not passed. */
export const isFresh = (story, today) => story.review_by >= today;

/** The hub strip: featured, fresh stories in `order`, at most `max`. A story naming a model that is not current is left out. */
export function featuredStrip(stories, today, isCurrentPid = () => true, max = 4) {
  return stories
    .filter((s) => s.featured && isFresh(s, today) && s.related_pids.every(isCurrentPid))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, max);
}

/** Stories that name any of the given PIDs (one model card can hold several variant PIDs). */
export const storiesMentioning = (stories, pids) => stories.filter((s) => s.related_pids.some((p) => pids.includes(p)));

/** Categories that have at least one story, in the fixed order, with their counts. */
export function categoryCounts(stories) {
  const counts = new Map();
  for (const s of stories) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  return CATEGORY_ORDER.filter((c) => counts.has(c)).map((category) => ({ category, count: counts.get(category) }));
}

/** The story index order: newest published first. */
export const indexOrder = (stories) => [...stories].sort((a, b) => b.published_date.localeCompare(a.published_date) || a.id.localeCompare(b.id));

/** A YouTube watch URL and a nocookie embed URL from an 11-character ID. */
export const youtubeWatchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

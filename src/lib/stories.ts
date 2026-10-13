// The published stories as the pages see them. Reads src/data/generated/stories.json, which `npm run build:data`
// writes from the ready stories only.
import data from '../data/generated/stories.json';
import { FAMILY_DATA, type Card, type Family } from './catalog';
import { featuredStrip, indexOrder, storiesMentioning } from './stories-logic.mjs';
import type { Lang } from '../i18n';

export type StoryCategory = 'new' | 'licence' | 'security' | 'family' | 'event';

export interface Story {
  id: string;
  slug: Record<Lang, string>;
  title: Record<Lang, string>;
  teaser: Record<Lang, string>;
  why: Record<Lang, string>;
  body: Record<Lang, string>;
  category: StoryCategory;
  published_date: string;
  last_verified: string;
  review_by: string;
  featured: boolean;
  order: number | null;
  related_pids: string[];
  cta_family: Family | null;
  video_youtube_id: string | null;
  sources: { title: string; url: string }[];
}

export const STORIES = indexOrder((data as unknown as { stories: Story[] }).stories) as Story[];

export const today = (): string => new Date().toISOString().slice(0, 10);

export interface RelatedModel {
  family: Family;
  card: Card;
}

const FAMILIES = Object.keys(FAMILY_DATA) as Family[];

export function cardForPid(pid: string): RelatedModel | null {
  for (const family of FAMILIES) {
    const card = FAMILY_DATA[family].lookup.get(pid);
    if (card) return { family, card };
  }
  return null;
}

/** The model cards a story names. Variants of one model share a card, so each card appears once. */
export function relatedModels(story: Story): RelatedModel[] {
  const seen = new Set<string>();
  const out: RelatedModel[] = [];
  for (const pid of story.related_pids) {
    const hit = cardForPid(pid);
    if (hit && !seen.has(`${hit.family}/${hit.card.slug}`)) {
      seen.add(`${hit.family}/${hit.card.slug}`);
      out.push(hit);
    }
  }
  return out;
}

/** Hub strip: featured and fresh, in order, never a story that names a model that is not current. */
export const hubStories = (): Story[] =>
  featuredStrip(STORIES, today(), (pid: string) => cardForPid(pid)?.card.lifecycle === 'current') as Story[];

export const storiesAboutCard = (card: Card): Story[] => storiesMentioning(STORIES, card.pids) as Story[];

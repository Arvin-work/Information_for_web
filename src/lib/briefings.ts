import { getCollection } from 'astro:content';
import { normalizeProps } from '../../public/assets/briefing/model.mjs';
import { briefingPagePath } from './briefing-archive.mjs';

export interface BriefingPayload {
  date: string;
  title: string;
  subtitle: string;
  introSeconds: number;
  itemSeconds: number;
  detailSeconds?: number;
  outroSeconds: number;
  sections?: { id: string; title: string; count?: number }[];
  monitoring?: { title: string; lines: string[] }[];
  items: {
    section?: string;
    shortName?: string;
    name: string;
    vendor: string;
    blurb: string;
    note: string;
    details: [string, string][];
    sources: [string, string][];
  }[];
}

export async function getPublishedBriefings() {
  const entries = await getCollection('briefings', ({ data }) => !data.draft);
  const dates = new Set<string>();
  return entries
    .map((entry) => {
      if (dates.has(entry.data.date))
        throw new Error(`Duplicate briefing date: ${entry.data.date}`);
      dates.add(entry.data.date);
      return {
        date: entry.data.date,
        title: entry.data.title,
        summary: entry.data.subtitle,
        href: briefingPagePath(entry.data.date),
        payload: normalizeProps(entry.data) as BriefingPayload,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

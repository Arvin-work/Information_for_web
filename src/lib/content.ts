import { getCollection } from 'astro:content';
import tools from '../data/tools.json';
import { categories } from '../data/categories';
import { getPublishedBriefings } from './briefings';
import { groupBriefings } from './briefing-archive.mjs';

const safeId = /^[a-z0-9][a-z0-9_-]*$/;

export async function getPublishedPosts() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const paths = new Set<string>();
  const terminalIds = new Set<string>();
  for (const post of posts) {
    const { data } = post;
    if (
      !data.date ||
      !data.path ||
      !data.terminalId ||
      !safeId.test(data.terminalId)
    ) {
      throw new Error(
        `Published article ${post.id} needs date, path and a lowercase terminalId.`,
      );
    }
    if (!categories.some((category) => category.slug === data.category)) {
      throw new Error(
        `Unknown category in article ${post.id}: ${data.category}`,
      );
    }
    if (terminalIds.has(data.terminalId))
      throw new Error(`Duplicate terminalId: ${data.terminalId}`);
    terminalIds.add(data.terminalId);
    for (const path of [data.path, ...data.aliases]) {
      if (
        !/^\/posts\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.html$/.test(path) ||
        path.includes('..') ||
        paths.has(path)
      ) {
        throw new Error(`Invalid or duplicate article path: ${path}`);
      }
      paths.add(path);
    }
  }
  return posts.sort(
    (a, b) =>
      b.data.date!.getTime() - a.data.date!.getTime() ||
      a.id.localeCompare(b.id),
  );
}

export function getTools() {
  const ids = new Set<string>();
  for (const tool of tools) {
    if (
      !safeId.test(tool.id) ||
      ids.has(tool.id) ||
      !tool.path.startsWith('/') ||
      tool.path.startsWith('//')
    ) {
      throw new Error(`Invalid tool entry: ${tool.id}`);
    }
    ids.add(tool.id);
  }
  return tools;
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '.');
}

export async function getContentTree() {
  const posts = await getPublishedPosts();
  const archive = groupBriefings(await getPublishedBriefings());
  const tools = getTools();
  const tree: Record<
    string,
    { label: string; children?: string[]; anchor?: string; href?: string }
  > = {
    '/': { label: 'main', children: ['block-1', 'block-2', 'notes', 'tools'] },
    '/block-1': { label: '信息', anchor: 'block-1', children: ['ai-daily'] },
    '/block-1/ai-daily': {
      label: 'AI 每日早报',
      children: archive.map((year) => year.year),
    },
    '/block-2': { label: '板块二', anchor: 'block-2', children: [] },
    '/notes': {
      label: '手记',
      anchor: 'notes',
      children: posts.map((post) => post.data.terminalId!),
    },
    '/tools': {
      label: '工具箱',
      anchor: 'tools',
      children: tools.map((tool) => tool.id),
    },
  };
  for (const year of archive) {
    const yearPath = `/block-1/ai-daily/${year.year}`;
    tree[yearPath] = {
      label: `${year.year} 年`,
      children: year.months.map((month) => month.month),
    };
    for (const month of year.months) {
      const monthPath = `${yearPath}/${month.month}`;
      tree[monthPath] = {
        label: `${Number(month.month)} 月`,
        children: month.issues.map((issue) => issue.date.slice(8)),
      };
      for (const issue of month.issues) {
        tree[`${monthPath}/${issue.date.slice(8)}`] = {
          label: `${issue.date} · AI 每日早报`,
          href: issue.href,
        };
      }
    }
  }
  for (const post of posts)
    tree[`/notes/${post.data.terminalId}`] = {
      label: post.data.title,
      href: post.data.path,
    };
  for (const tool of tools)
    tree[`/tools/${tool.id}`] = { label: tool.title, href: tool.path };
  return tree;
}

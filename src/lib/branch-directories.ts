import { branches } from '../data/branches';
import { categories } from '../data/categories';
import { getPublishedPosts, getTools, formatDate } from './content';
import { getPublishedBriefings } from './briefings';
import { briefingArchivePath, groupBriefings } from './briefing-archive.mjs';

interface DirectoryItem {
  href: string;
  title: string;
  summary: string;
  kicker: string;
}
interface DirectoryGroup {
  id: string;
  title: string;
  description: string;
  color: string;
  href?: string;
  items: DirectoryItem[];
}
interface BranchDirectory {
  id: string;
  title: string;
  description: string;
  color: string;
  slug: string;
  parent: string;
  parentLabel: string;
  transitionId: string;
  groups: DirectoryGroup[];
  count?: number;
  countLabel?: string;
  archiveYears?: ReturnType<typeof groupBriefings>;
}

export async function getBranchDirectories() {
  const [posts, briefings] = await Promise.all([
    getPublishedPosts(),
    getPublishedBriefings(),
  ]);
  const tools = getTools();
  const archive = groupBriefings(briefings);
  const briefingColor = 'var(--branch-a)';
  const dayNodes = (
    issues: { date: string; href: string; summary: string }[],
  ) =>
    issues.map((issue) => ({
      href: issue.href,
      title: `${Number(issue.date.slice(8))} 日 · AI 每日早报`,
      summary: issue.summary,
      kicker: issue.date.replaceAll('-', '.'),
    }));
  const yearNodes = archive.map((year) => ({
    href: year.href,
    title: `${year.year} 年`,
    summary: `${year.count} 期早报，按月份继续展开。`,
    kicker: 'YEAR / ' + year.year,
  }));
  const monthNodes = (year: (typeof archive)[number]) =>
    year.months.map((month) => ({
      href: month.href,
      title: `${Number(month.month)} 月`,
      summary: `${month.issues.length} 期早报，按日期继续展开。`,
      kicker: `${year.year} / ${month.month}`,
    }));
  const articleNodes = (category: string) =>
    posts
      .filter((post) => post.data.category === category)
      .map((post) => ({
        href: post.data.path!,
        title: post.data.title,
        summary: post.data.summary,
        kicker: formatDate(post.data.date!),
      }));
  const categoryGroups = categories.map((category, index) => ({
    id: category.slug,
    title: category.label,
    description: category.description,
    color: `var(--branch-${index % 2 === 0 ? 'c' : 'b'})`,
    href: `/branches/notes/${category.slug}/`,
    items: articleNodes(category.slug),
  }));
  const catalog: BranchDirectory[] = branches.map((branch) => ({
    ...branch,
    slug: branch.id,
    parent: '/#' + branch.id,
    parentLabel: '全部分支',
    transitionId: branch.id,
    ...(branch.id === 'block-1'
      ? { count: briefings.length, countLabel: '期已发布早报' }
      : {}),
    groups:
      branch.id === 'block-1'
        ? [
            {
              id: 'ai-daily',
              title: 'AI 每日早报',
              description: '模型发布、能力更新与开放进展，按年、月、日归档。',
              color: briefingColor,
              href: briefingArchivePath(),
              items: yearNodes,
            },
          ]
        : branch.id === 'notes'
          ? categoryGroups
          : [
              {
                id: branch.id + '-contents',
                title: branch.id === 'tools' ? '可用工具' : '从这里继续',
                description:
                  branch.id === 'tools'
                    ? '打开工具，继续动手。'
                    : '这里还没有已发布的内容。',
                color: branch.color,
                href: undefined,
                items:
                  branch.id === 'tools'
                    ? tools.map((tool) => ({
                        href: tool.path,
                        title: tool.title,
                        summary: tool.summary,
                        kicker: tool.kicker,
                      }))
                    : [],
              },
            ],
  }));
  catalog.push({
    id: 'ai-daily',
    title: 'AI 每日早报',
    description: '展开月份，直接打开每天的早报。新的年份沿主干向下接续。',
    color: briefingColor,
    slug: 'block-1/ai-daily',
    parent: '/branches/block-1/',
    parentLabel: '信息',
    transitionId: 'ai-daily',
    count: briefings.length,
    countLabel: '期已发布早报',
    archiveYears: archive,
    groups: archive.length
      ? archive.map((year) => ({
          id: `ai-daily-${year.year}`,
          title: `${year.year} 年`,
          description: `${year.count} 期早报，按月份展开。`,
          color: briefingColor,
          href: year.href,
          items: monthNodes(year),
        }))
      : [
          {
            id: 'ai-daily-empty',
            title: '早报归档',
            description: '首期早报发布后，年、月、日分支会自动出现。',
            color: briefingColor,
            items: [],
          },
        ],
  });
  for (const year of archive) {
    catalog.push({
      id: `ai-daily-${year.year}`,
      title: `${year.year} 年`,
      description: 'AI 每日早报 · 月份归档',
      color: briefingColor,
      slug: `block-1/ai-daily/${year.year}`,
      parent: briefingArchivePath(),
      parentLabel: 'AI 每日早报',
      transitionId: `ai-daily-${year.year}`,
      count: year.count,
      countLabel: '期已发布早报',
      archiveYears: [year],
      groups: year.months.map((month) => ({
        id: `ai-daily-${year.year}-${month.month}`,
        title: `${Number(month.month)} 月`,
        description: `${month.issues.length} 期早报，打开日期查看完整内容。`,
        color: briefingColor,
        href: month.href,
        items: dayNodes(month.issues),
      })),
    });
    for (const month of year.months) {
      const key = `${year.year}-${month.month}`;
      catalog.push({
        id: `ai-daily-${key}`,
        title: `${year.year} 年 ${Number(month.month)} 月`,
        description: 'AI 每日早报 · 选择一天，阅读本期内容或播放动画。',
        color: briefingColor,
        slug: `block-1/ai-daily/${year.year}/${month.month}`,
        parent: year.href,
        parentLabel: `${year.year} 年`,
        transitionId: `ai-daily-${key}`,
        count: month.issues.length,
        countLabel: '期已发布早报',
        archiveYears: [
          { ...year, count: month.issues.length, months: [month] },
        ],
        groups: [
          {
            id: `ai-daily-${key}-days`,
            title: '每日早报',
            description: '按日期从近到远排列。',
            color: briefingColor,
            items: dayNodes(month.issues),
          },
        ],
      });
    }
  }
  for (const category of categories) {
    catalog.push({
      id: category.slug,
      title: category.label,
      description: category.description,
      color: 'var(--branch-c)',
      slug: `notes/${category.slug}`,
      parent: '/branches/notes/',
      parentLabel: '手记',
      transitionId: category.slug,
      groups: [
        {
          id: category.slug + '-contents',
          title: '文章',
          description: '沿着内容继续向下探索。',
          color: 'var(--branch-c)',
          href: undefined,
          items: articleNodes(category.slug),
        },
      ],
    });
  }
  return catalog;
}

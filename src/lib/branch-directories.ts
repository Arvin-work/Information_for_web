import { branches } from '../data/branches';
import { categories } from '../data/categories';
import { getPublishedPosts, getTools, formatDate } from './content';

export async function getBranchDirectories() {
  const posts = await getPublishedPosts();
  const tools = getTools();
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
  const catalog = branches.map((branch) => ({
    ...branch,
    slug: branch.id,
    parent: '/#' + branch.id,
    parentLabel: '全部分支',
    transitionId: branch.id,
    groups:
      branch.id === 'notes'
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

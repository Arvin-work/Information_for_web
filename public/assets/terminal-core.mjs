/** A virtual content filesystem. Commands never run a system shell. */
import { contentTree } from './content-index.mjs';
export { contentTree };

export function resolvePath(cwd, value = '/') {
  const parts = value.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
  for (const part of value.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else {
      const aliases = {
        板块一: 'block-1',
        信息: 'block-1',
        信息板块: 'block-1',
        AI每日早报: 'ai-daily',
        板块二: 'block-2',
        手记: 'notes',
        工具箱: 'tools',
      };
      parts.push(aliases[part] || part);
    }
  }
  return '/' + parts.join('/');
}
export function runCommand(command, cwd = '/') {
  const tokens = command.trim().split(/\s+/);
  const verb = tokens[0],
    value = tokens[1];
  const result = { cwd, lines: [], items: [] };
  if (!verb) return result;
  if (tokens.length > 2)
    return { ...result, lines: ['一次只支持一个路径参数。'] };
  if (verb === 'clear') return { ...result, clear: true };
  if (verb === 'help')
    return {
      ...result,
      lines: [
        'ls [路径]     列出板块或文章（文件名可点击）',
        'cd 路径       进入板块；cd .. 返回上一级',
        'pwd           显示当前位置',
        'open 文件名   显示文章或工具入口',
        'cat 文件名    与 open 相同',
        'clear         清空终端',
        '↑ / ↓ 历史命令 · Tab 补全命令或文件名',
      ],
    };
  if (verb === 'pwd') return { ...result, lines: [cwd] };
  if (!['ls', 'cd', 'open', 'cat'].includes(verb))
    return { ...result, lines: [`zsh: command not found: ${verb}`] };
  const path = resolvePath(cwd, value || (verb === 'cd' ? '/' : '.'));
  const entry = contentTree[path];
  if (!entry)
    return {
      ...result,
      lines: [`${verb}: no such file or directory: ${value || '.'}`],
    };
  if (verb === 'cd') {
    if (!entry.children)
      return { ...result, lines: [`cd: not a directory: ${value}`] };
    return { ...result, cwd: path, anchor: entry.anchor, lines: [] };
  }
  if (verb === 'ls') {
    const entries = entry.children
      ? entry.children.map((name) => {
          const itemPath = path === '/' ? '/' + name : path + '/' + name;
          return { name, path: itemPath, ...contentTree[itemPath] };
        })
      : [{ name: path.split('/').at(-1), path, ...entry }];
    return {
      ...result,
      lines: entries.length
        ? []
        : ['这条分支暂时留白，内容准备好后会出现在这里。'],
      items: entries,
    };
  }
  if (entry.children)
    return {
      ...result,
      lines: ['这是板块，请使用 cd 进入，再用 ls 查看内容。'],
    };
  return {
    ...result,
    items: [{ name: path.split('/').at(-1), path, ...entry }],
    lines: ['点击下面的文件打开内容：'],
  };
}
export function completions(command, cwd) {
  const [verb, fragment = ''] = command.trimStart().split(/\s+/);
  if (!command.includes(' '))
    return ['ls', 'cd', 'pwd', 'open', 'cat', 'clear', 'help'].filter((name) =>
      name.startsWith(verb),
    );
  const dir = fragment.includes('/')
    ? fragment.slice(0, fragment.lastIndexOf('/') + 1)
    : '';
  const prefix = fragment.slice(dir.length);
  const entry = contentTree[resolvePath(cwd, dir || '.')];
  return (entry?.children || [])
    .filter((name) => name.startsWith(prefix))
    .map((name) => `${verb} ${dir}${name}`);
}
export function complete(command, cwd) {
  const matches = completions(command, cwd);
  if (matches.length === 1) return { value: matches[0], matches };
  let shared = matches[0] || '';
  for (const match of matches) {
    let index = 0;
    while (
      index < shared.length &&
      index < match.length &&
      shared[index] === match[index]
    )
      index++;
    shared = shared.slice(0, index);
  }
  const value =
    shared.startsWith(command) && command.length < shared.length
      ? shared
      : command;
  return { value, matches };
}

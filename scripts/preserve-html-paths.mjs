import { readdir, rename, rmdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Astro directory builds put a .html route in .html/index.html.
 * Flatten just those routes so existing URLs remain actual files. */
export default function preserveHtmlPaths() {
  return {
    name: 'preserve-html-paths',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        async function visit(directory) {
          for (const entry of await readdir(directory, {
            withFileTypes: true,
          })) {
            if (!entry.isDirectory()) continue;
            const path = join(directory, entry.name);
            await visit(path);
            if (!entry.name.endsWith('.html')) continue;
            const contents = await readdir(path);
            if (contents.length !== 1 || contents[0] !== 'index.html') {
              throw new Error(`Cannot flatten legacy HTML route: ${path}`);
            }
            const temporary = `${path}.flattening`;
            await rename(join(path, 'index.html'), temporary);
            await rmdir(path);
            await rename(temporary, path);
          }
        }
        const output = fileURLToPath(dir);
        await visit(output);

        // With HTML handling disabled, explicitly map directory URLs to their
        // index files. Cloudflare applies these rules without a Worker script.
        const rules = [];
        async function collectIndexes(directory) {
          const entries = await readdir(directory, { withFileTypes: true });
          entries.sort((a, b) => a.name.localeCompare(b.name));
          for (const entry of entries) {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) await collectIndexes(path);
            else if (entry.name === 'index.html') {
              const target = '/' + relative(output, path).split('\\').join('/');
              const route = target.slice(0, -'index.html'.length);
              rules.push(`${route} ${target} 200`);
              if (route !== '/')
                rules.push(`${route.slice(0, -1)} ${route} 301`);
            }
          }
        }
        await collectIndexes(output);
        await writeFile(join(output, '_redirects'), rules.join('\n') + '\n');
      },
    },
  };
}

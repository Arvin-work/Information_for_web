import type { APIRoute } from 'astro';
import { getContentTree } from '../../lib/content';

export const GET: APIRoute = async () => {
  const tree = JSON.stringify(await getContentTree()).replaceAll(
    '<',
    '\\u003c',
  );
  return new Response(`export const contentTree = ${tree};\n`, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
};

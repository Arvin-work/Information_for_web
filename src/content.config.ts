import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    category: z.string().default('computer'),
    summary: z.string().default(''),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
    path: z.string().optional(),
    aliases: z.array(z.string()).default([]),
    terminalId: z.string().optional(),
    reading: z.number().optional(),
  }),
});

export const collections = { posts };

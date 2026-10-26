import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { normalizeProps } from '../public/assets/briefing/model.mjs';

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

const briefings = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/briefings' }),
  schema: z
    .looseObject({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((date) => {
          const parsed = new Date(date + 'T00:00:00Z');
          return (
            !Number.isNaN(parsed.getTime()) &&
            parsed.toISOString().slice(0, 10) === date
          );
        }, '早报日期必须是有效的 YYYY-MM-DD 日期'),
      title: z.string(),
      subtitle: z.string(),
      draft: z.boolean().default(true),
    })
    .superRefine((data, context) => {
      try {
        normalizeProps(data);
      } catch (error) {
        context.addIssue({
          code: 'custom',
          message: error instanceof Error ? error.message : '早报内容无效',
        });
      }
    }),
});

export const collections = { posts, briefings };

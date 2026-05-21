import { defineCollection, z } from 'astro:content';

const baseSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date(),
  summary: z.string(),
  tags: z.array(z.string()).default([]),
  relatedNotes: z.array(z.string()).default([]),
  category: z.string(),
  importance: z.number().int().min(1).max(5).default(2),
  draft: z.boolean().default(false)
});

const blog = defineCollection({
  type: 'content',
  schema: baseSchema.extend({
    type: z.literal('blog')
  })
});

const notes = defineCollection({
  type: 'content',
  schema: baseSchema.extend({
    type: z.literal('note')
  })
});

const diary = defineCollection({
  type: 'content',
  schema: baseSchema.extend({
    type: z.literal('diary')
  })
});

const important = defineCollection({
  type: 'content',
  schema: baseSchema.extend({
    type: z.literal('important'),
    plan: z.array(z.object({
      title: z.string(),
      status: z.enum(['done', 'active', 'planned']),
      detail: z.string(),
    })).optional(),
    todos: z.array(z.object({
      text: z.string(),
      done: z.boolean(),
    })).optional(),
    intro: z.string().optional(),
    avatar: z.string().optional(),
    links: z.array(z.object({
      label: z.string(),
      url: z.string(),
    })).optional(),
  })
});

export const collections = {
  blog,
  notes,
  important,
  diary
};

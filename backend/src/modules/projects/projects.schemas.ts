import { z } from 'zod';

export const createProjectSchema = z.object({
  companyId: z.string().optional(),  // self-service: projeto pode nascer sem company
  name: z.string().min(2),
  projectCode: z.string().max(100).optional(), // código de obra: PJ-2026-014
  description: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  projectCode: z.string().max(100).optional(),
  description: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),
  status: z.enum(['active', 'archived', 'completed', 'empty', 'processing', 'ready', 'failed']).optional(),
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

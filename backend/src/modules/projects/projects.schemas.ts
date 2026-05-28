import { z } from 'zod';

export const createProjectSchema = z.object({
  companyId: z.string(),
  name: z.string().min(2),
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
  status: z.enum(['active', 'archived', 'completed']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

import { z } from 'zod';

// Cost table (SINAPI or custom price list)
export const CostTableSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  scenario_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  source: z.enum(['sinapi', 'custom', 'import']).default('custom'),
  state_code: z.string().length(2).optional(), // UF (ex: 'SP', 'RJ')
  reference_month: z.date().nullable(), // SINAPI reference month
  created_by: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const CreateCostTableSchema = CostTableSchema.omit({
  id: true,
  created_by: true,
  created_at: true,
  updated_at: true,
});

export const UpdateCostTableSchema = CreateCostTableSchema.partial();

// Cost item (line item in cost table)
export const CostItemSchema = z.object({
  id: z.string().uuid(),
  cost_table_id: z.string().uuid(),
  code: z.string().max(50).optional(), // SINAPI code ex: "74209/001"
  description: z.string().min(1),
  unit: z.string().min(1).max(20), // 'm²', 'm³', 'un', 'kg', 'h'
  unit_price: z.string().regex(/^\d+(\.\d{1,4})?$/), // DECIMAL(12,4) as string
  notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const CreateCostItemSchema = CostItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const UpdateCostItemSchema = CreateCostItemSchema.partial();

// Element cost link (IFC element → cost item mapping)
export const ElementCostLinkSchema = z.object({
  id: z.string().uuid(),
  scenario_id: z.string().uuid(),
  element_global_id: z.string().max(22),
  cost_item_id: z.string().uuid(),
  quantity: z.string().regex(/^\d+(\.\d{1,4})?$/), // DECIMAL(14,4) as string
  quantity_unit: z.string().max(20).optional(),
  override_price: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(), // DECIMAL(12,4) as string
  override_reason: z.string().min(1).optional(), // mandatory if override_price set
  note: z.string().optional(),
  created_by: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const RawCreateElementCostLinkSchema = ElementCostLinkSchema.omit({
  id: true,
  created_by: true,
  created_at: true,
  updated_at: true,
});

export const CreateElementCostLinkSchema = RawCreateElementCostLinkSchema.refine(
  (data) => !data.override_price || data.override_reason,
  { message: 'override_reason is required when override_price is set', path: ['override_reason'] }
);

export const UpdateElementCostLinkSchema = RawCreateElementCostLinkSchema.partial().refine(
  (data) => !data.override_price || data.override_reason,
  { message: 'override_reason is required when override_price is set', path: ['override_reason'] }
);

// Types
export type CostTable = z.infer<typeof CostTableSchema>;
export type CreateCostTable = z.infer<typeof CreateCostTableSchema>;
export type UpdateCostTable = z.infer<typeof UpdateCostTableSchema>;

export type CostItem = z.infer<typeof CostItemSchema>;
export type CreateCostItem = z.infer<typeof CreateCostItemSchema>;
export type UpdateCostItem = z.infer<typeof UpdateCostItemSchema>;

export type ElementCostLink = z.infer<typeof ElementCostLinkSchema>;
export type CreateElementCostLink = z.infer<typeof CreateElementCostLinkSchema>;
export type UpdateElementCostLink = z.infer<typeof UpdateElementCostLinkSchema>;

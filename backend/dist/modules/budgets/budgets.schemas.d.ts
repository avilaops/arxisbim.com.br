import { z } from 'zod';
export declare const costItemInputSchema: z.ZodObject<{
    description: z.ZodString;
    unit: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    linkedElements: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>>;
    position: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateCostItemSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    unit: z.ZodOptional<z.ZodString>;
    quantity: z.ZodOptional<z.ZodNumber>;
    unitPrice: z.ZodOptional<z.ZodNumber>;
    linkedElements: z.ZodOptional<z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>>>;
    position: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const createBudgetSchema: z.ZodObject<{
    projectId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        unit: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        linkedElements: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>>;
        position: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const updateBudgetSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const listBudgetsQuerySchema: z.ZodObject<{
    projectId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type CostItemInput = z.infer<typeof costItemInputSchema>;
export type UpdateCostItemInput = z.infer<typeof updateCostItemSchema>;
export type ListBudgetsQuery = z.infer<typeof listBudgetsQuerySchema>;
//# sourceMappingURL=budgets.schemas.d.ts.map
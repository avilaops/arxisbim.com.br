import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas.js';
export declare class ProjectsService {
    private db;
    constructor();
    list(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        name: string;
        description: string | null;
        location: {
            address?: string;
            city?: string;
            country?: string;
            coordinates?: {
                lat: number;
                lng: number;
            };
        } | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    get(id: string, tenantId: string): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        name: string;
        description: string | null;
        location: {
            address?: string;
            city?: string;
            country?: string;
            coordinates?: {
                lat: number;
                lng: number;
            };
        } | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(tenantId: string, input: CreateProjectInput): Promise<{
        id: string;
        name: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        status: string;
        companyId: string;
        location: {
            address?: string;
            city?: string;
            country?: string;
            coordinates?: {
                lat: number;
                lng: number;
            };
        } | null;
    }>;
    update(id: string, tenantId: string, input: UpdateProjectInput): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        name: string;
        description: string | null;
        location: {
            address?: string;
            city?: string;
            country?: string;
            coordinates?: {
                lat: number;
                lng: number;
            };
        } | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=projects.service.d.ts.map
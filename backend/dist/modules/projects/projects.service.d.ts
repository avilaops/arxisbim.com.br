import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas.js';
export declare class ProjectsService {
    private db;
    constructor();
    list(tenantId: string): Promise<any>;
    get(id: string, tenantId: string): Promise<any>;
    create(tenantId: string, input: CreateProjectInput): Promise<any>;
    update(id: string, tenantId: string, input: UpdateProjectInput): Promise<any>;
    delete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=projects.service.d.ts.map
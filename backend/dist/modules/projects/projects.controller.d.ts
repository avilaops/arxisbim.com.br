import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProjectsService } from './projects.service.js';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    list(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    get(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    create(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    update(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    delete(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=projects.controller.d.ts.map
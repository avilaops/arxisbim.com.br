import { createProjectSchema, updateProjectSchema } from './projects.schemas.js';
export class ProjectsController {
    projectsService;
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    async list(request, reply) {
        const { tenantId } = request.user;
        const projects = await this.projectsService.list(tenantId);
        return reply.send(projects);
    }
    async get(request, reply) {
        const { id } = request.params;
        const { tenantId } = request.user;
        const project = await this.projectsService.get(id, tenantId);
        return reply.send(project);
    }
    async create(request, reply) {
        const { tenantId } = request.user;
        const body = createProjectSchema.parse(request.body);
        const project = await this.projectsService.create(tenantId, body);
        return reply.code(201).send(project);
    }
    async update(request, reply) {
        const { id } = request.params;
        const { tenantId } = request.user;
        const body = updateProjectSchema.parse(request.body);
        const project = await this.projectsService.update(id, tenantId, body);
        return reply.send(project);
    }
    async delete(request, reply) {
        const { id } = request.params;
        const { tenantId } = request.user;
        await this.projectsService.delete(id, tenantId);
        return reply.code(204).send();
    }
}
//# sourceMappingURL=projects.controller.js.map
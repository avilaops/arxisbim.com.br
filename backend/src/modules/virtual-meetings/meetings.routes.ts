import type { FastifyInstance } from 'fastify';
import { MeetingsController } from './meetings.controller.js';
import { MeetingsService } from './meetings.service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';

export async function meetingsRoutes(fastify: FastifyInstance) {
  const meetingsService = new MeetingsService();
  const meetingsController = new MeetingsController(meetingsService);

  // Create meeting room
  fastify.post('/', {
    schema: {
      description: 'Create a new virtual meeting room',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          settings: {
            type: 'object',
            properties: {
              maxParticipants: { type: 'number' },
              allowRecording: { type: 'boolean' },
              allowChat: { type: 'boolean' },
            }
          },
          avatarSettings: {
            type: 'object',
            properties: {
              defaultAvatar: { type: 'string' },
              allowCustomAvatars: { type: 'boolean' },
            }
          }
        }
      },
      response: {
        201: {
          description: 'Meeting room created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            projectId: { type: 'string' },
            roomUrl: { type: 'string' },
            meetingCode: { type: 'string' },
            hostUserId: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string' },
          }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.createRoom.bind(meetingsController),
  });

  // Get room by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get meeting room by ID',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.getRoom.bind(meetingsController),
  });

  // Get room by meeting code
  fastify.get('/code/:code', {
    schema: {
      description: 'Get meeting room by code',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          code: { type: 'string' }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.getRoomByCode.bind(meetingsController),
  });

  // List rooms by project
  fastify.get('/project/:projectId', {
    schema: {
      description: 'List all meeting rooms for a project',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.listRoomsByProject.bind(meetingsController),
  });

  // Get participants
  fastify.get('/:roomId/participants', {
    schema: {
      description: 'Get all participants in a room',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          roomId: { type: 'string', format: 'uuid' }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.getParticipants.bind(meetingsController),
  });

  // Get messages
  fastify.get('/:roomId/messages', {
    schema: {
      description: 'Get chat messages from a room',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          roomId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.getMessages.bind(meetingsController),
  });

  // Get collaboration state/history
  fastify.get('/:roomId/collaboration', {
    schema: {
      description: 'Get CRDT collaboration snapshot and updates for a meeting room',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          roomId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          afterVersion: { type: 'number', default: 0 },
          limit: { type: 'number', default: 100 }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.getCollaborationHistory.bind(meetingsController),
  });

  // Append collaboration update (HTTP fallback for Socket.IO)
  fastify.post('/:roomId/collaboration/updates', {
    schema: {
      description: 'Append a CRDT collaboration update to a meeting room',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          roomId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['update'],
        properties: {
          update: {
            type: 'array',
            items: { type: 'number', minimum: 0, maximum: 255 }
          },
          origin: { type: 'string' },
          isSnapshot: { type: 'boolean' }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.appendCollaborationUpdate.bind(meetingsController),
  });

  // Store compact collaboration snapshot
  fastify.put('/:roomId/collaboration/snapshot', {
    schema: {
      description: 'Store a compact CRDT collaboration snapshot for late joiners',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          roomId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['update'],
        properties: {
          update: {
            type: 'array',
            items: { type: 'number', minimum: 0, maximum: 255 }
          },
          origin: { type: 'string' }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.upsertCollaborationSnapshot.bind(meetingsController),
  });

  // Media config (LiveKit token when configured, P2P fallback otherwise)
  fastify.get('/:roomId/media-config', {
    schema: {
      description: 'Get media provider configuration for immersive meeting voice/video',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          roomId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          userName: { type: 'string' }
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.getMediaConfig.bind(meetingsController),
  });

  // End room
  fastify.delete('/:id', {
    schema: {
      description: 'End a meeting room (host only)',
      tags: ['virtual-meetings'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        204: {
          description: 'Room ended successfully',
          type: 'null'
        }
      }
    },
    preHandler: authenticateRequest,
    handler: meetingsController.endRoom.bind(meetingsController),
  });
}

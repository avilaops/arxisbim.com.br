/**
 * Scenario Schemas
 * Schemas Zod para validação de dados do módulo de cenário
 */
import { z } from 'zod';
export declare const vector3Schema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodNumber;
}, z.core.$strip>;
export declare const rotationSchema: z.ZodObject<{
    pitch: z.ZodNumber;
    yaw: z.ZodNumber;
    roll: z.ZodNumber;
}, z.core.$strip>;
export declare const minimapConfigSchema: z.ZodObject<{
    width: z.ZodDefault<z.ZodNumber>;
    height: z.ZodDefault<z.ZodNumber>;
    position: z.ZodDefault<z.ZodEnum<{
        "top-left": "top-left";
        "top-right": "top-right";
        "bottom-left": "bottom-left";
        "bottom-right": "bottom-right";
    }>>;
    zoom: z.ZodDefault<z.ZodNumber>;
    showPlayerDirection: z.ZodDefault<z.ZodBoolean>;
    backgroundColor: z.ZodDefault<z.ZodString>;
    borderColor: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const scenarioConfigSchema: z.ZodObject<{
    initialPosition: z.ZodDefault<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$strip>>;
    initialRotation: z.ZodDefault<z.ZodObject<{
        pitch: z.ZodNumber;
        yaw: z.ZodNumber;
        roll: z.ZodNumber;
    }, z.core.$strip>>;
    movementSpeed: z.ZodDefault<z.ZodNumber>;
    rotationSpeed: z.ZodDefault<z.ZodNumber>;
    crouchMultiplier: z.ZodDefault<z.ZodNumber>;
    sprintMultiplier: z.ZodDefault<z.ZodNumber>;
    verticalSpeed: z.ZodDefault<z.ZodNumber>;
    enableMinimap: z.ZodDefault<z.ZodBoolean>;
    minimapConfig: z.ZodDefault<z.ZodObject<{
        width: z.ZodDefault<z.ZodNumber>;
        height: z.ZodDefault<z.ZodNumber>;
        position: z.ZodDefault<z.ZodEnum<{
            "top-left": "top-left";
            "top-right": "top-right";
            "bottom-left": "bottom-left";
            "bottom-right": "bottom-right";
        }>>;
        zoom: z.ZodDefault<z.ZodNumber>;
        showPlayerDirection: z.ZodDefault<z.ZodBoolean>;
        backgroundColor: z.ZodDefault<z.ZodString>;
        borderColor: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const createScenarioSchema: z.ZodObject<{
    projectId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    presetId: z.ZodOptional<z.ZodString>;
    config: z.ZodDefault<z.ZodObject<{
        initialPosition: z.ZodDefault<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, z.core.$strip>>;
        initialRotation: z.ZodDefault<z.ZodObject<{
            pitch: z.ZodNumber;
            yaw: z.ZodNumber;
            roll: z.ZodNumber;
        }, z.core.$strip>>;
        movementSpeed: z.ZodDefault<z.ZodNumber>;
        rotationSpeed: z.ZodDefault<z.ZodNumber>;
        crouchMultiplier: z.ZodDefault<z.ZodNumber>;
        sprintMultiplier: z.ZodDefault<z.ZodNumber>;
        verticalSpeed: z.ZodDefault<z.ZodNumber>;
        enableMinimap: z.ZodDefault<z.ZodBoolean>;
        minimapConfig: z.ZodDefault<z.ZodObject<{
            width: z.ZodDefault<z.ZodNumber>;
            height: z.ZodDefault<z.ZodNumber>;
            position: z.ZodDefault<z.ZodEnum<{
                "top-left": "top-left";
                "top-right": "top-right";
                "bottom-left": "bottom-left";
                "bottom-right": "bottom-right";
            }>>;
            zoom: z.ZodDefault<z.ZodNumber>;
            showPlayerDirection: z.ZodDefault<z.ZodBoolean>;
            backgroundColor: z.ZodDefault<z.ZodString>;
            borderColor: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const updateScenarioSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodObject<{
        initialPosition: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, z.core.$strip>>>;
        initialRotation: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            pitch: z.ZodNumber;
            yaw: z.ZodNumber;
            roll: z.ZodNumber;
        }, z.core.$strip>>>;
        movementSpeed: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        rotationSpeed: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        crouchMultiplier: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        sprintMultiplier: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        verticalSpeed: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        enableMinimap: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        minimapConfig: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            width: z.ZodDefault<z.ZodNumber>;
            height: z.ZodDefault<z.ZodNumber>;
            position: z.ZodDefault<z.ZodEnum<{
                "top-left": "top-left";
                "top-right": "top-right";
                "bottom-left": "bottom-left";
                "bottom-right": "bottom-right";
            }>>;
            zoom: z.ZodDefault<z.ZodNumber>;
            showPlayerDirection: z.ZodDefault<z.ZodBoolean>;
            backgroundColor: z.ZodDefault<z.ZodString>;
            borderColor: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const inputEventSchema: z.ZodObject<{
    type: z.ZodEnum<{
        keydown: "keydown";
        keyup: "keyup";
    }>;
    keyCode: z.ZodString;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const positionUpdateSchema: z.ZodObject<{
    position: z.ZodOptional<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
    }, z.core.$strip>>;
    rotation: z.ZodOptional<z.ZodObject<{
        pitch: z.ZodNumber;
        yaw: z.ZodNumber;
        roll: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const teleportSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodNumber;
}, z.core.$strip>;
export declare const scenarioQuerySchema: z.ZodObject<{
    projectId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;
export type UpdateScenarioInput = z.infer<typeof updateScenarioSchema>;
export type InputEventInput = z.infer<typeof inputEventSchema>;
export type PositionUpdateInput = z.infer<typeof positionUpdateSchema>;
export type TeleportInput = z.infer<typeof teleportSchema>;
export type ScenarioQueryInput = z.infer<typeof scenarioQuerySchema>;
//# sourceMappingURL=scenario.schemas.d.ts.map
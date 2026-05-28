/**
 * Camera Controller
 * Controle de rotação da câmera (Arrow Keys)
 */
export class CameraController {
    /**
     * Atualiza rotação da câmera baseado nos inputs
     * @param currentRotation Rotação atual da câmera
     * @param inputState Estado dos inputs
     * @param rotationSpeed Velocidade de rotação (graus por segundo)
     * @param deltaTime Tempo decorrido (segundos)
     * @returns Nova rotação
     */
    updateRotation(currentRotation, inputState, rotationSpeed, deltaTime) {
        const rotation = { ...currentRotation };
        const rotationDelta = rotationSpeed * deltaTime;
        // Rotação vertical (Pitch) - Setas para cima/baixo
        if (inputState.rotateUp) {
            rotation.pitch += rotationDelta;
        }
        if (inputState.rotateDown) {
            rotation.pitch -= rotationDelta;
        }
        // Rotação horizontal (Yaw) - Setas para esquerda/direita
        if (inputState.rotateLeft) {
            rotation.yaw -= rotationDelta;
        }
        if (inputState.rotateRight) {
            rotation.yaw += rotationDelta;
        }
        // Aplicar limites
        return this.applyRotationLimits(rotation);
    }
    /**
     * Aplica limites de rotação para evitar valores inválidos
     * Pitch: -90° a +90° (não pode virar de cabeça para baixo completamente)
     * Yaw: -180° a +180° (normaliza valores)
     */
    applyRotationLimits(rotation) {
        return {
            pitch: this.clamp(rotation.pitch, -89, 89), // Limite vertical
            yaw: this.normalizeAngle(rotation.yaw), // Normaliza horizontal
            roll: rotation.roll, // Roll geralmente não é usado em FPS
        };
    }
    /**
     * Normaliza ângulo para ficar entre -180 e +180 graus
     */
    normalizeAngle(angle) {
        angle = angle % 360;
        if (angle > 180) {
            angle -= 360;
        }
        else if (angle < -180) {
            angle += 360;
        }
        return angle;
    }
    /**
     * Limita valor entre min e max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    /**
     * Converte rotação para quaternion (útil para renderização 3D)
     */
    toQuaternion(rotation) {
        const pitch = (rotation.pitch * Math.PI) / 180;
        const yaw = (rotation.yaw * Math.PI) / 180;
        const roll = (rotation.roll * Math.PI) / 180;
        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);
        return {
            w: cr * cp * cy + sr * sp * sy,
            x: sr * cp * cy - cr * sp * sy,
            y: cr * sp * cy + sr * cp * sy,
            z: cr * cp * sy - sr * sp * cy,
        };
    }
    /**
     * Converte rotação para vetor de direção (forward vector)
     */
    getForwardVector(rotation) {
        const pitchRad = (rotation.pitch * Math.PI) / 180;
        const yawRad = (rotation.yaw * Math.PI) / 180;
        return {
            x: Math.sin(yawRad) * Math.cos(pitchRad),
            y: -Math.sin(pitchRad),
            z: Math.cos(yawRad) * Math.cos(pitchRad),
        };
    }
    /**
     * Interpolação suave de rotação (smooth camera)
     */
    smoothRotation(current, target, smoothFactor = 0.1) {
        return {
            pitch: this.lerp(current.pitch, target.pitch, smoothFactor),
            yaw: this.lerpAngle(current.yaw, target.yaw, smoothFactor),
            roll: this.lerp(current.roll, target.roll, smoothFactor),
        };
    }
    /**
     * Interpolação linear
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    /**
     * Interpolação linear para ângulos (considera wrap-around em 360°)
     */
    lerpAngle(start, end, factor) {
        let diff = end - start;
        // Pega o caminho mais curto
        if (diff > 180) {
            diff -= 360;
        }
        else if (diff < -180) {
            diff += 360;
        }
        return this.normalizeAngle(start + diff * factor);
    }
}
//# sourceMappingURL=camera-controller.js.map
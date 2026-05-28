/**
 * Movement Controller
 * Controle de movimento 3D (WASD + QE)
 * Inspirado em jogos FPS como Counter-Strike
 */
export class MovementController {
    /**
     * Calcula movimento baseado no input e estado do jogador
     * @param inputState Estado dos inputs do teclado
     * @param playerState Estado atual do jogador
     * @param deltaTime Tempo decorrido desde último frame (em segundos)
     * @returns Nova velocidade do jogador
     */
    calculateMovement(inputState, playerState, deltaTime) {
        const velocity = { x: 0, y: 0, z: 0 };
        // Velocidade base
        let speed = playerState.movementSpeed;
        // Aplicar modificadores
        if (inputState.crouch) {
            speed *= playerState.crouchMultiplier; // Agachado = mais lento
        }
        if (inputState.sprint && !inputState.crouch) {
            speed *= playerState.sprintMultiplier; // Sprint = mais rápido (não pode sprintar agachado)
        }
        // Calcular direção baseado na rotação do jogador (yaw)
        const yawRad = (playerState.rotation.yaw * Math.PI) / 180;
        const forward = { x: Math.sin(yawRad), z: Math.cos(yawRad) };
        const right = { x: Math.cos(yawRad), z: -Math.sin(yawRad) };
        // Movement horizontal (WASD)
        if (inputState.forward) {
            velocity.x += forward.x * speed;
            velocity.z += forward.z * speed;
        }
        if (inputState.backward) {
            velocity.x -= forward.x * speed;
            velocity.z -= forward.z * speed;
        }
        if (inputState.right) {
            velocity.x += right.x * speed;
            velocity.z += right.z * speed;
        }
        if (inputState.left) {
            velocity.x -= right.x * speed;
            velocity.z -= right.z * speed;
        }
        // Movement vertical (Q/E)
        const verticalSpeed = speed; // Mesma velocidade base
        if (inputState.up) {
            velocity.y += verticalSpeed;
        }
        if (inputState.down) {
            velocity.y -= verticalSpeed;
        }
        // Normalizar velocidade diagonal para evitar movimento mais rápido
        const horizontalMagnitude = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
        if (horizontalMagnitude > speed) {
            const scale = speed / horizontalMagnitude;
            velocity.x *= scale;
            velocity.z *= scale;
        }
        return velocity;
    }
    /**
     * Atualiza posição do jogador baseado na velocidade
     * @param position Posição atual
     * @param velocity Velocidade calculada
     * @param deltaTime Tempo decorrido (segundos)
     * @returns Nova posição
     */
    updatePosition(position, velocity, deltaTime) {
        return {
            x: position.x + velocity.x * deltaTime,
            y: position.y + velocity.y * deltaTime,
            z: position.z + velocity.z * deltaTime,
        };
    }
    /**
     * Aplica limites de movimento (bounds do cenário)
     * @param position Posição a ser limitada
     * @param bounds Limites do cenário
     * @returns Posição limitada
     */
    applyBounds(position, bounds) {
        if (!bounds)
            return position;
        return {
            x: this.clamp(position.x, bounds.minX, bounds.maxX),
            y: this.clamp(position.y, bounds.minY, bounds.maxY),
            z: this.clamp(position.z, bounds.minZ, bounds.maxZ),
        };
    }
    /**
     * Limita valor entre min e max
     */
    clamp(value, min, max) {
        if (min !== undefined && value < min)
            return min;
        if (max !== undefined && value > max)
            return max;
        return value;
    }
    /**
     * Calcula velocidade de movimento suave (smooth movement)
     * Aplica interpolação para movimento mais fluido
     */
    smoothMovement(currentVelocity, targetVelocity, smoothFactor = 0.1) {
        return {
            x: this.lerp(currentVelocity.x, targetVelocity.x, smoothFactor),
            y: this.lerp(currentVelocity.y, targetVelocity.y, smoothFactor),
            z: this.lerp(currentVelocity.z, targetVelocity.z, smoothFactor),
        };
    }
    /**
     * Interpolação linear
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
}
//# sourceMappingURL=movement-controller.js.map
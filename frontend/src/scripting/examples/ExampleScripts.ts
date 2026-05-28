/**
 * Example Scripts for ArxisVR ScriptingSystem
 * 
 * These scripts demonstrate the ScriptAPI capabilities:
 * - Object creation and manipulation
 * - Animation
 * - Event handling
 * - Scene interaction
 */

// ========== Script 1: Rotating Cube ==========
export const rotatingCubeScript = `
// Create a rotating cube
const cube = api.createCube(2, 0xff4444);
cube.position.set(0, 2, -5);
cube.name = 'RotatingCube';
api.addObject(cube);

api.log('Rotating cube created!');

return {
  update(delta) {
    const cube = api.findObjectByName('RotatingCube');
    if (cube) {
      cube.rotation.y += delta;
      cube.rotation.x += delta * 0.5;
    }
  },
  stop() {
    const cube = api.findObjectByName('RotatingCube');
    if (cube) {
      api.removeObject(cube);
    }
    api.log('Rotating cube removed');
  }
};
`;

// ========== Script 2: Interactive Light ==========
export const interactiveLightScript = `
// Create a pulsating point light
const light = api.addPointLight(0xffaa44, 5, 20);
light.position.set(0, 3, 0);
light.name = 'PulsatingLight';

let time = 0;

api.log('Interactive light created!');

return {
  update(delta) {
    time += delta;
    
    const light = api.findObjectByName('PulsatingLight');
    if (light) {
      // Pulse intensity
      light.intensity = 3 + Math.sin(time * 3) * 2;
      
      // Move in circle
      light.position.x = Math.cos(time) * 5;
      light.position.z = Math.sin(time) * 5;
    }
  },
  stop() {
    const light = api.findObjectByName('PulsatingLight');
    if (light) {
      api.removeObject(light);
    }
    api.log('Light removed');
  }
};
`;

// ========== Script 3: Particle System (Simple) ==========
export const particleSystemScript = `
// Simple particle system using spheres
const particles = [];
const particleCount = 20;

for (let i = 0; i < particleCount; i++) {
  const particle = api.createSphere(0.1, 0x44aaff);
  particle.position.set(
    api.random(-5, 5),
    api.random(0, 5),
    api.random(-5, 5)
  );
  particle.name = 'Particle_' + i;
  
  // Store velocity
  particle.userData = {
    velocity: api.vector3(
      api.random(-1, 1),
      api.random(-2, 0),
      api.random(-1, 1)
    )
  };
  
  api.addObject(particle);
  particles.push(particle);
}

api.log('Particle system created: ' + particleCount + ' particles');

return {
  update(delta) {
    particles.forEach((particle, index) => {
      const p = api.findObjectByName('Particle_' + index);
      if (p) {
        // Apply velocity
        p.position.x += p.userData.velocity.x * delta;
        p.position.y += p.userData.velocity.y * delta;
        p.position.z += p.userData.velocity.z * delta;
        
        // Apply gravity
        p.userData.velocity.y -= 9.8 * delta;
        
        // Reset if too low
        if (p.position.y < 0) {
          p.position.y = 5;
          p.userData.velocity.y = api.random(1, 3);
        }
      }
    });
  },
  stop() {
    particles.forEach((_, index) => {
      const p = api.findObjectByName('Particle_' + index);
      if (p) {
        api.removeObject(p);
      }
    });
    api.log('Particles removed');
  }
};
`;

// ========== Script 4: Animated Color Sphere ==========
export const colorSphereScript = `
// Create a sphere that changes color
const sphere = api.createSphere(1.5, 0xffffff);
sphere.position.set(5, 2, 0);
sphere.name = 'ColorSphere';
api.addObject(sphere);

let hue = 0;

api.log('Color sphere created!');

return {
  update(delta) {
    const sphere = api.findObjectByName('ColorSphere');
    if (sphere) {
      hue += delta * 50;
      if (hue > 360) hue = 0;
      
      // Convert HSL to hex
      const h = hue / 60;
      const c = 1;
      const x = c * (1 - Math.abs(h % 2 - 1));
      let r = 0, g = 0, b = 0;
      
      if (h < 1) { r = c; g = x; }
      else if (h < 2) { r = x; g = c; }
      else if (h < 3) { g = c; b = x; }
      else if (h < 4) { g = x; b = c; }
      else if (h < 5) { r = x; b = c; }
      else { r = c; b = x; }
      
      const color = (Math.floor(r * 255) << 16) + (Math.floor(g * 255) << 8) + Math.floor(b * 255);
      sphere.material.color.setHex(color);
      
      // Rotate
      sphere.rotation.y += delta;
    }
  },
  stop() {
    const sphere = api.findObjectByName('ColorSphere');
    if (sphere) {
      api.removeObject(sphere);
    }
    api.log('Color sphere removed');
  }
};
`;

// ========== Script 5: Interactive Camera Controller ==========
export const cameraControllerScript = `
// Move camera in a circle around origin
let angle = 0;
const radius = 15;
const height = 5;

api.log('Camera controller active - Press S to stop script');

return {
  update(delta) {
    angle += delta * 0.5;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    api.setCameraPosition(x, height, z);
    api.setCameraLookAt(0, 0, 0);
  },
  stop() {
    api.log('Camera controller stopped');
  }
};
`;

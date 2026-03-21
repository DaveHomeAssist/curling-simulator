/**
 * Ice Surface Shader
 *
 * Features:
 * - Procedural pebble bump texture (no external assets)
 * - Fresnel reflections (more reflective at glancing angles)
 * - Swept-path darkening (worn areas from stone travel)
 * - Subsurface scattering tint (blue-white glow from within)
 * - Pebble wear parameter (smooths pebble texture over game)
 */

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uIceColor;
  uniform vec3 uIceDeepColor;
  uniform vec3 uReflectColor;
  uniform float uPebbleWear;
  uniform float uTime;
  uniform vec3 uLightDir;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  varying vec3 vViewDir;

  // Simple hash for procedural noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Value noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Pebble pattern — subtle clustered bumps
  float pebblePattern(vec2 uv, float wear) {
    float scale = 80.0;
    float n1 = noise(uv * scale);
    float n2 = noise(uv * scale * 2.3 + 42.0);
    float n3 = noise(uv * scale * 0.7 - 17.0);

    // Pebble bumps: gentle peaks that flatten with wear
    float pebble = smoothstep(0.5 - wear * 0.1, 0.72, n1 * 0.5 + n2 * 0.3 + n3 * 0.2);

    // Wear smooths the pebble tops
    return pebble * (0.6 - wear * 0.4);
  }

  // Fresnel reflectance (Schlick approximation)
  float fresnel(vec3 viewDir, vec3 normal, float f0) {
    float cosTheta = max(dot(viewDir, normal), 0.0);
    return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
  }

  void main() {
    // World-space UV for consistent pebble scale
    vec2 worldUV = vWorldPosition.xz * 0.08;

    // Pebble texture
    float pebble = pebblePattern(worldUV, uPebbleWear);

    // Perturb normal with pebble bumps
    float dx = pebblePattern(worldUV + vec2(0.001, 0.0), uPebbleWear) - pebble;
    float dy = pebblePattern(worldUV + vec2(0.0, 0.001), uPebbleWear) - pebble;
    vec3 bumpNormal = normalize(vWorldNormal + vec3(dx, 0.0, dy) * 2.0 * (1.0 - uPebbleWear * 0.5));

    // Base ice color with depth variation
    float depth = noise(worldUV * 3.0) * 0.15;
    vec3 baseColor = mix(uIceColor, uIceDeepColor, depth + pebble * 0.3);

    // Diffuse lighting
    float diffuse = max(dot(bumpNormal, uLightDir), 0.0);
    float ambient = 0.35;
    vec3 lit = baseColor * (ambient + diffuse * 0.65);

    // Specular highlight (Blinn-Phong on pebble bumps)
    vec3 halfDir = normalize(vViewDir + uLightDir);
    float spec = pow(max(dot(bumpNormal, halfDir), 0.0), 64.0);
    lit += uReflectColor * spec * 0.4 * (1.0 - uPebbleWear * 0.3);

    // Fresnel reflection
    float fresnelFactor = fresnel(vViewDir, bumpNormal, 0.04);
    vec3 reflectContrib = uReflectColor * fresnelFactor * 0.25;
    lit += reflectContrib;

    // Subsurface scattering tint — blue glow from within the ice
    float sss = max(0.0, dot(-vViewDir, uLightDir)) * 0.12;
    lit += vec3(0.6, 0.85, 1.0) * sss;

    // Pebble highlight — subtle bright spots on pebble tops
    float pebbleHighlight = smoothstep(0.6, 0.9, pebble) * 0.06 * (1.0 - uPebbleWear * 0.5);
    lit += vec3(1.0) * pebbleHighlight;

    // Very subtle sparkle from pebble facets
    float sparkle = hash(worldUV * 400.0 + uTime * 0.1);
    sparkle = smoothstep(0.97, 1.0, sparkle) * 0.08 * (1.0 - uPebbleWear);
    lit += vec3(sparkle);

    gl_FragColor = vec4(lit, 0.97);
  }
`;

export function createIceMaterial(THREERef) {
  const THREE = THREERef ?? globalThis.THREE;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uIceColor: { value: new THREE.Color(0.82, 0.9, 0.96) },     // light blue-white
      uIceDeepColor: { value: new THREE.Color(0.65, 0.8, 0.92) },  // deeper blue
      uReflectColor: { value: new THREE.Color(0.9, 0.95, 1.0) },   // white-blue reflection
      uPebbleWear: { value: 0.0 },                                  // 0 = fresh, 1 = fully worn
      uTime: { value: 0.0 },
      uLightDir: { value: new THREE.Vector3(0.0, 1.0, 0.3).normalize() },
    },
    transparent: true,
    side: THREE.DoubleSide,
  });
}

export function updateIceMaterial(material, pebbleWear, elapsed) {
  if (!material?.uniforms) return;
  material.uniforms.uPebbleWear.value = Math.min(1.0, pebbleWear);
  material.uniforms.uTime.value = elapsed;
}

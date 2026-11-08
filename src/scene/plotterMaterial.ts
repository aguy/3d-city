import * as THREE from 'three';
import {
  CameraParameters,
  DEFAULT_CAMERA_PARAMS,
  PaperTheme,
  RenderMode,
} from '../types/cameraTypes';

export interface PaperThemePalette {
  paperBgHex: number;
  roadFillHex: number;
  primaryInkHex: number;
  secondaryInkHex: number;
  accentInkHex: number;
  secondPenHex: number;
  gradientHorizonHex: number;
  gradientZenithHex: number;
  cssPaperBg: string;
  cssGradientBg: string;
  cssSidebarBg: string;
  cssInkBlack: string;
  cssInkMuted: string;
  cssBorderInk: string;
  cssGridMinor: string;
  cssGridMajor: string;
}

export const PAPER_THEME_PALETTES: Record<PaperTheme, PaperThemePalette> = {
  cream: {
    paperBgHex: 0xfaf8f2,
    roadFillHex: 0xf4f2ec,
    primaryInkHex: 0x111111,
    secondaryInkHex: 0x333333,
    accentInkHex: 0x1a1a1a,
    secondPenHex: 0xc8321e,
    gradientHorizonHex: 0xf6c28b,
    gradientZenithHex: 0xd97b73,
    cssPaperBg: '#f8f6f0',
    cssGradientBg:
      'linear-gradient(180deg, #d97b73 0%, #f6c28b 46%, #f8f6f0 90%)',
    cssSidebarBg: '#f1efe8',
    cssInkBlack: '#121212',
    cssInkMuted: '#52524e',
    cssBorderInk: '#1e1e1c',
    cssGridMinor: 'rgba(35, 55, 80, 0.08)',
    cssGridMajor: 'rgba(35, 55, 80, 0.17)',
  },
  blueprint: {
    paperBgHex: 0x0d2b4e,
    roadFillHex: 0x0a223f,
    primaryInkHex: 0xeaf6ff,
    secondaryInkHex: 0x8cc9f8,
    accentInkHex: 0xffffff,
    secondPenHex: 0xffcc4d,
    gradientHorizonHex: 0x1f6fb2,
    gradientZenithHex: 0x5b2c82,
    cssPaperBg: '#0d2b4e',
    cssGradientBg:
      'linear-gradient(180deg, #5b2c82 0%, #1f6fb2 48%, #0d2b4e 90%)',
    cssSidebarBg: '#f1efe8',
    cssInkBlack: '#121212',
    cssInkMuted: '#52524e',
    cssBorderInk: '#1e1e1c',
    cssGridMinor: 'rgba(180, 225, 255, 0.12)',
    cssGridMajor: 'rgba(180, 225, 255, 0.26)',
  },
  terminal: {
    paperBgHex: 0x0f1412,
    roadFillHex: 0x141b18,
    primaryInkHex: 0x4af686,
    secondaryInkHex: 0x29a656,
    accentInkHex: 0xa2ffbe,
    secondPenHex: 0xffb340,
    gradientHorizonHex: 0x14524b,
    gradientZenithHex: 0x3b1d5e,
    cssPaperBg: '#0f1412',
    cssGradientBg:
      'linear-gradient(180deg, #3b1d5e 0%, #14524b 48%, #0f1412 90%)',
    cssSidebarBg: '#f1efe8',
    cssInkBlack: '#121212',
    cssInkMuted: '#52524e',
    cssBorderInk: '#1e1e1c',
    cssGridMinor: 'rgba(74, 246, 134, 0.09)',
    cssGridMajor: 'rgba(74, 246, 134, 0.2)',
  },
  vellum: {
    paperBgHex: 0xf3ead8,
    roadFillHex: 0xebe0ca,
    primaryInkHex: 0x2b1d12,
    secondaryInkHex: 0x5c422c,
    accentInkHex: 0x1d120a,
    secondPenHex: 0xa83820,
    gradientHorizonHex: 0xe6ad68,
    gradientZenithHex: 0xc4684b,
    cssPaperBg: '#f3ead8',
    cssGradientBg:
      'linear-gradient(180deg, #c4684b 0%, #e6ad68 46%, #f3ead8 90%)',
    cssSidebarBg: '#efe5d2',
    cssInkBlack: '#2b1d12',
    cssInkMuted: '#634d3a',
    cssBorderInk: '#2b1d12',
    cssGridMinor: 'rgba(95, 65, 35, 0.09)',
    cssGridMajor: 'rgba(95, 65, 35, 0.19)',
  },
};

export const plotterStyleUniforms = {
  uJitter: { value: 0.0 },
  uManualSketch: { value: 0.0 },
  uLineWeight: { value: 1.2 },
  uOvershoot: { value: 0.0 },
  uInkPooling: { value: 0.0 },
  uInkDropout: { value: 0.0 },
  uSketchPasses: { value: 1.0 },
  uHatchDensity: { value: 0.0 },
  uStippleShade: { value: 0.0 },
  uDepthTaper: { value: 0.0 },
  uDofBlur: { value: 0.0 },
  uFocalDistance: { value: 65.0 },
  uPenMisregistration: { value: 0.0 },
  uLensCurvature: { value: 0.0 },
  uPointsDensity: { value: 0.25 },
  uPointSize: { value: 3.5 },
  uDistantGradient: { value: 0.0 },
  uInkColor: { value: new THREE.Color(0x111111) },
  uPaperColor: { value: new THREE.Color(0xfaf8f2) },
  uSecondPenColor: { value: new THREE.Color(0xc8321e) },
  uGradientHorizonColor: { value: new THREE.Color(0xf6c28b) },
  uGradientZenithColor: { value: new THREE.Color(0xd97b73) },
};

const VERTEX_PREAMBLE = /* glsl */ `
  uniform float uJitter;
  uniform float uManualSketch;
  uniform float uLensCurvature;
  varying vec3 vPlotterWorldPos;
  varying float vPlotterViewDepth;

  vec3 plotterHash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
`;

const VERTEX_PROJECT_REPLACEMENT = /* glsl */ `
  vec4 mvPosition = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  vec4 worldPos = modelMatrix * mvPosition;
  if (uJitter > 0.001) {
    vec3 cell = floor(worldPos.xyz * 3.5 + 0.5);
    vec3 n = plotterHash3(cell);
    worldPos.xyz += n * (uJitter * 0.26);
  }
  mvPosition = viewMatrix * worldPos;
  vPlotterWorldPos = worldPos.xyz;
  vPlotterViewDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  if (abs(uLensCurvature) > 0.001) {
    vec2 ndc = gl_Position.xy / max(0.25, gl_Position.w);
    float r2 = clamp(dot(ndc, ndc), 0.0, 2.5);
    gl_Position.xy *= (1.0 - uLensCurvature * 0.24 * r2);
  }
`;

function bindCommonUniforms(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uJitter = plotterStyleUniforms.uJitter;
  shader.uniforms.uManualSketch = plotterStyleUniforms.uManualSketch;
  shader.uniforms.uLensCurvature = plotterStyleUniforms.uLensCurvature;
  shader.uniforms.uHatchDensity = plotterStyleUniforms.uHatchDensity;
  shader.uniforms.uStippleShade = plotterStyleUniforms.uStippleShade;
  shader.uniforms.uDepthTaper = plotterStyleUniforms.uDepthTaper;
  shader.uniforms.uInkDropout = plotterStyleUniforms.uInkDropout;
  shader.uniforms.uInkPooling = plotterStyleUniforms.uInkPooling;
  shader.uniforms.uDistantGradient = plotterStyleUniforms.uDistantGradient;
  shader.uniforms.uInkColor = plotterStyleUniforms.uInkColor;
  shader.uniforms.uPaperColor = plotterStyleUniforms.uPaperColor;
  shader.uniforms.uGradientHorizonColor =
    plotterStyleUniforms.uGradientHorizonColor;
  shader.uniforms.uGradientZenithColor =
    plotterStyleUniforms.uGradientZenithColor;
}

/**
 * Attaches vertex jitter, curvilinear lens distortion, distant atmospheric gradient,
 * and 3D surface cross-hatching / stippling to occluder meshes.
 */
function attachOccluderShader(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    bindCommonUniforms(shader);
    shader.vertexShader = VERTEX_PREAMBLE + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      VERTEX_PROJECT_REPLACEMENT
    );

    shader.fragmentShader =
      /* glsl */ `
      uniform float uHatchDensity;
      uniform float uStippleShade;
      uniform float uDistantGradient;
      uniform vec3 uInkColor;
      uniform vec3 uGradientHorizonColor;
      uniform vec3 uGradientZenithColor;
      varying vec3 vPlotterWorldPos;
      varying float vPlotterViewDepth;

      float plotterHash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      /* glsl */ `
      #include <dithering_fragment>
      if (uDistantGradient > 0.5) {
        float distFactor = smoothstep(42.0, 220.0, vPlotterViewDepth);
        float heightMix = clamp((vPlotterWorldPos.y / 68.0) * 0.55 + distFactor * 0.45, 0.0, 1.0);
        vec3 distantGradRgb = mix(uGradientHorizonColor, uGradientZenithColor, heightMix);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, distantGradRgb, distFactor * 0.82);
      }
      if (uHatchDensity > 0.001 || uStippleShade > 0.001) {
        vec3 dx = dFdx(vPlotterWorldPos);
        vec3 dy = dFdy(vPlotterWorldPos);
        vec3 faceNormal = normalize(cross(dx, dy));
        // Directional architectural shading: side walls & undersides receive hatching/stippling
        float sunDot = dot(faceNormal, normalize(vec3(0.45, 0.78, 0.42)));
        float wallShade = clamp(0.68 - sunDot * 0.65, 0.0, 1.0);
        // Suppress hatching on flat horizontal road surfaces unless steep
        if (abs(faceNormal.y) > 0.85) {
          wallShade *= 0.18;
        }
        float depthFade = 1.0 - smoothstep(30.0, 240.0, vPlotterViewDepth) * 0.55;
        float inkMask = 0.0;

        if (uHatchDensity > 0.001 && wallShade > 0.18) {
          float pitch = mix(9.0, 3.8, uHatchDensity);
          float diag1 = abs(fract((gl_FragCoord.x + gl_FragCoord.y) / pitch) - 0.5);
          float lineW = 0.12 + 0.12 * uHatchDensity;
          float h1 = 1.0 - smoothstep(lineW * 0.6, lineW, diag1);
          inkMask = max(inkMask, h1 * smoothstep(0.18, 0.42, wallShade));

          // Secondary perpendicular cross-hatch on deeper shadowed facades
          if (wallShade > 0.46) {
            float diag2 = abs(fract((gl_FragCoord.x - gl_FragCoord.y) / pitch) - 0.5);
            float h2 = 1.0 - smoothstep(lineW * 0.6, lineW, diag2);
            inkMask = max(inkMask, h2 * smoothstep(0.46, 0.75, wallShade));
          }
        }

        if (uStippleShade > 0.001 && wallShade > 0.14) {
          vec2 cell = floor(gl_FragCoord.xy / 2.2);
          float rnd = plotterHash12(cell);
          float threshold = wallShade * uStippleShade * 0.85;
          if (rnd < threshold) {
            inkMask = max(inkMask, 0.82);
          }
        }

        gl_FragColor.rgb = mix(gl_FragColor.rgb, uInkColor, clamp(inkMask * depthFade * 0.85, 0.0, 0.9));
      }
      `
    );
  };
}

/**
 * Enriches a LineSegments BufferGeometry with partner-endpoint coordinates (`aSegmentOther`)
 * and segment metadata (`aSegmentMeta`: x = 0 at start / 1 at end, y = deterministic seed)
 * so the vertex/fragment shaders can project straight 3D architectural corner overshoot lines
 * that taper to a sharp point past each vertex and emphasize corner intersections.
 */
function enrichLineSegmentsGeometry(geo: THREE.BufferGeometry): void {
  const posAttr = geo.getAttribute('position');
  if (!posAttr || posAttr.count < 2) return;
  const count = posAttr.count;
  const otherPositions = new Float32Array(count * 3);
  const segmentMeta = new Float32Array(count * 2);

  for (let i = 0; i + 1 < count; i += 2) {
    const x0 = posAttr.getX(i);
    const y0 = posAttr.getY(i);
    const z0 = posAttr.getZ(i);
    const x1 = posAttr.getX(i + 1);
    const y1 = posAttr.getY(i + 1);
    const z1 = posAttr.getZ(i + 1);

    otherPositions[i * 3] = x1;
    otherPositions[i * 3 + 1] = y1;
    otherPositions[i * 3 + 2] = z1;

    otherPositions[(i + 1) * 3] = x0;
    otherPositions[(i + 1) * 3 + 1] = y0;
    otherPositions[(i + 1) * 3 + 2] = z0;

    const mx = (x0 + x1) * 0.5;
    const my = (y0 + y1) * 0.5;
    const mz = (z0 + z1) * 0.5;
    const rawHash =
      Math.sin(mx * 12.9898 + my * 78.233 + mz * 37.719) * 43758.5453;
    const seed = rawHash - Math.floor(rawHash);

    segmentMeta[i * 2] = 0.0;
    segmentMeta[i * 2 + 1] = seed;
    segmentMeta[(i + 1) * 2] = 1.0;
    segmentMeta[(i + 1) * 2 + 1] = seed;
  }

  geo.setAttribute(
    'aSegmentOther',
    new THREE.BufferAttribute(otherPositions, 3)
  );
  geo.setAttribute('aSegmentMeta', new THREE.BufferAttribute(segmentMeta, 2));
}

/**
 * Attaches straight 3D architectural corner overshoot extensions, corner ink emphasis,
 * mid-segment pressure tapering, vertex jitter, and curvilinear lens distortion to LineBasicMaterial instances.
 */
function attachLineShader(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    bindCommonUniforms(shader);
    shader.vertexShader =
      VERTEX_PREAMBLE +
      /* glsl */ `
      attribute vec3 aSegmentOther;
      attribute vec2 aSegmentMeta;
      varying float vLineParam;
      varying float vOvershootRatio;
      varying float vStrokeSeed;
      ` +
      shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      /* glsl */ `
      vec3 localPos = transformed;
      vLineParam = aSegmentMeta.x;
      vOvershootRatio = 0.0;
      vStrokeSeed = aSegmentMeta.y;

      if (uManualSketch > 0.001) {
        vec3 segVec = transformed - aSegmentOther;
        float segLen = length(segVec);
        if (segLen > 0.35) {
          vec3 outDir = segVec / segLen;
          float seedFactor = 0.45 + 0.85 * aSegmentMeta.y;
          // Longer construction line extensions on primary vertical and long architectural edges
          float baseExt = clamp(segLen * 0.24, 0.16, 2.8) * seedFactor;
          if (abs(outDir.y) > 0.75 && segLen > 1.4) {
            baseExt *= 1.45;
          }
          float extLen = baseExt * uManualSketch;
          float ratio = extLen / segLen;
          localPos += outDir * extLen;
          vOvershootRatio = ratio;
          vLineParam = (aSegmentMeta.x < 0.5) ? (-ratio) : (1.0 + ratio);
        }
      }

      vec4 mvPosition = vec4( localPos, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 worldPos = modelMatrix * mvPosition;
      if (uJitter > 0.001) {
        vec3 cell = floor(worldPos.xyz * 3.5 + 0.5);
        vec3 n = plotterHash3(cell);
        worldPos.xyz += n * (uJitter * 0.26);
      }
      mvPosition = viewMatrix * worldPos;
      if (uManualSketch > 0.001) {
        // Slight camera-ward depth bias so corner extensions and intersections stay crisp in front of coplanar faces
        mvPosition.z += 0.12 * uManualSketch;
      }
      vPlotterWorldPos = worldPos.xyz;
      vPlotterViewDepth = -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
      if (abs(uLensCurvature) > 0.001) {
        vec2 ndc = gl_Position.xy / max(0.25, gl_Position.w);
        float r2 = clamp(dot(ndc, ndc), 0.0, 2.5);
        gl_Position.xy *= (1.0 - uLensCurvature * 0.24 * r2);
      }
      `
    );

    shader.fragmentShader =
      /* glsl */ `
      uniform float uManualSketch;
      uniform float uDepthTaper;
      uniform float uInkDropout;
      uniform float uInkPooling;
      varying vec3 vPlotterWorldPos;
      varying float vPlotterViewDepth;
      varying float vLineParam;
      varying float vOvershootRatio;
      varying float vStrokeSeed;

      float plotterLineHash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      /* glsl */ `
      #include <dithering_fragment>
      if (uManualSketch > 0.001) {
        if (vLineParam < 0.0 || vLineParam > 1.0) {
          // Straight 3D architectural construction line shooting past the corner, tapering to a fine point
          float overDist = (vLineParam < 0.0)
            ? (-vLineParam / max(0.0001, vOvershootRatio))
            : ((vLineParam - 1.0) / max(0.0001, vOvershootRatio));
          if (overDist >= 1.0) discard;
          float tailTaper = pow(clamp(1.0 - overDist, 0.0, 1.0), 1.85);
          gl_FragColor.a *= tailTaper * (0.82 + 0.18 * uManualSketch);
        } else {
          // Firm, dark ink anchoring near corners (vLineParam near 0 or 1) and lighter fast-flick mid-span
          float cornerDist = min(vLineParam, 1.0 - vLineParam);
          float cornerAnchor = 1.0 - smoothstep(0.0, 0.16, cornerDist);
          float midSpan = smoothstep(0.08, 0.26, cornerDist);
          float sweepWave = 0.5 + 0.5 * sin(vLineParam * 6.28318 + vStrokeSeed * 6.28318);
          float midFade = mix(1.0, 0.42 + 0.58 * sweepWave, midSpan * uManualSketch * 0.85);
          // Occasional mid-line dry-pen lift on interior segments (while corners remain 100% solid)
          if (midSpan > 0.48 && vStrokeSeed > 0.66 && sweepWave < 0.24 * uManualSketch) {
            midFade *= 0.14;
          }
          gl_FragColor.a = clamp(gl_FragColor.a * midFade + cornerAnchor * 0.35 * uManualSketch, 0.0, 1.0);
        }
      }
      if (uInkDropout > 0.001) {
        vec2 noiseCell = floor(gl_FragCoord.xy * 0.65 + vPlotterWorldPos.xz * 2.0);
        float n = plotterLineHash(noiseCell);
        if (n < uInkDropout * 0.68) {
          discard;
        }
      }
      if (uDepthTaper > 0.001) {
        float distFactor = smoothstep(18.0, 210.0, vPlotterViewDepth);
        gl_FragColor.a *= mix(1.0, 1.0 - distFactor * 0.82, uDepthTaper);
      }
      if (uInkPooling > 0.001) {
        vec3 gridDist = abs(fract(vPlotterWorldPos * 1.5 + 0.5) - 0.5);
        float cornerProx = 1.0 - smoothstep(0.0, 0.18, min(gridDist.x, min(gridDist.y, gridDist.z)));
        gl_FragColor.a = clamp(gl_FragColor.a + cornerProx * uInkPooling * 0.35, 0.0, 1.0);
      }
      `
    );
  };
}

// Shared materials for performance and clean state switching
const sharedOccluderMaterial = new THREE.MeshBasicMaterial({
  color: PAPER_THEME_PALETTES.cream.paperBgHex,
  polygonOffset: true,
  polygonOffsetFactor: 1.5,
  polygonOffsetUnits: 1.5,
  transparent: true,
  opacity: 0.94,
});
attachOccluderShader(sharedOccluderMaterial);

const sharedRoadOccluderMaterial = new THREE.MeshBasicMaterial({
  color: PAPER_THEME_PALETTES.cream.roadFillHex,
  polygonOffset: true,
  polygonOffsetFactor: 2.0,
  polygonOffsetUnits: 2.0,
  transparent: true,
  opacity: 0.88,
});
attachOccluderShader(sharedRoadOccluderMaterial);

const sharedNormalMaterial = new THREE.MeshNormalMaterial({
  polygonOffset: true,
  polygonOffsetFactor: 1.0,
  polygonOffsetUnits: 1.0,
});
attachOccluderShader(sharedNormalMaterial);

const sharedPrimaryEdgeMaterial = new THREE.LineBasicMaterial({
  color: PAPER_THEME_PALETTES.cream.primaryInkHex,
  transparent: true,
  opacity: 1.0,
  linewidth: 1,
});
attachLineShader(sharedPrimaryEdgeMaterial);

const sharedSecondaryEdgeMaterial = new THREE.LineBasicMaterial({
  color: PAPER_THEME_PALETTES.cream.secondaryInkHex,
  transparent: true,
  opacity: 0.72,
  linewidth: 1,
});
attachLineShader(sharedSecondaryEdgeMaterial);

const sharedAccentEdgeMaterial = new THREE.LineBasicMaterial({
  color: PAPER_THEME_PALETTES.cream.accentInkHex,
  transparent: true,
  opacity: 0.95,
  linewidth: 1,
});
attachLineShader(sharedAccentEdgeMaterial);

export const sharedPointsMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uPointsDensity: plotterStyleUniforms.uPointsDensity,
    uPointSize: plotterStyleUniforms.uPointSize,
    uJitter: plotterStyleUniforms.uJitter,
    uLensCurvature: plotterStyleUniforms.uLensCurvature,
    uDepthTaper: plotterStyleUniforms.uDepthTaper,
    uInkColor: plotterStyleUniforms.uInkColor,
  },
  vertexShader: /* glsl */ `
    uniform float uPointsDensity;
    uniform float uPointSize;
    uniform float uJitter;
    uniform float uLensCurvature;
    attribute float aThreshold;
    varying float vVisible;
    varying float vPlotterViewDepth;

    vec3 plotterHash3(vec3 p) {
      p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
      );
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    void main() {
      if (aThreshold > uPointsDensity || uPointsDensity < 0.001) {
        gl_Position = vec4(2.0, 2.0, 2.0, 0.0);
        gl_PointSize = 0.0;
        vVisible = 0.0;
        return;
      }
      vVisible = 1.0;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      if (uJitter > 0.001) {
        vec3 cell = floor(worldPos.xyz * 3.5 + 0.5);
        vec3 n = plotterHash3(cell);
        worldPos.xyz += n * (uJitter * 0.22);
      }
      vec4 mvPosition = viewMatrix * worldPos;
      vPlotterViewDepth = -mvPosition.z;
      // Bias slightly toward camera in view space so points on building/road surfaces never lose depth test to occluders
      vec4 biasedMv = mvPosition;
      biasedMv.z += 0.26;
      gl_Position = projectionMatrix * biasedMv;
      if (abs(uLensCurvature) > 0.001) {
        vec2 ndc = gl_Position.xy / max(0.25, gl_Position.w);
        float r2 = clamp(dot(ndc, ndc), 0.0, 2.5);
        gl_Position.xy *= (1.0 - uLensCurvature * 0.24 * r2);
      }
      float depthAtten = clamp(68.0 / max(10.0, -mvPosition.z), 0.6, 2.4);
      gl_PointSize = clamp(uPointSize * depthAtten, 2.8, 14.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uInkColor;
    uniform float uDepthTaper;
    varying float vVisible;
    varying float vPlotterViewDepth;

    void main() {
      if (vVisible < 0.5) discard;
      vec2 coord = gl_PointCoord - vec2(0.5);
      float distSq = dot(coord, coord);
      if (distSq > 0.25) discard;
      float alpha = smoothstep(0.25, 0.16, distSq);
      if (uDepthTaper > 0.001) {
        float distFactor = smoothstep(18.0, 210.0, vPlotterViewDepth);
        alpha *= mix(1.0, 1.0 - distFactor * 0.82, uDepthTaper);
      }
      gl_FragColor = vec4(uInkColor, clamp(alpha * 1.15, 0.0, 1.0));
    }
  `,
  transparent: true,
  depthTest: true,
  depthWrite: false,
});

/**
 * Creates a THREE.Points cloud styled as plotter coordinate node stipples.
 */
export function createPlotterPoints(
  geometry: THREE.BufferGeometry
): THREE.Points {
  const points = new THREE.Points(geometry, sharedPointsMaterial);
  points.renderOrder = 5;
  points.frustumCulled = false;
  points.userData.isPlotterPoints = true;
  points.userData.alwaysVisibleInSobel = true;
  return points;
}

/**
 * Updates shared line weight and jitter uniforms/material properties.
 */
export function applyPlotterLineStyle(
  lineWeight: number,
  lineJitterPercent: number
): void {
  const clampedWeight = THREE.MathUtils.clamp(lineWeight, 0.4, 5.0);
  const normalizedJitter = THREE.MathUtils.clamp(lineJitterPercent / 100, 0, 1);

  plotterStyleUniforms.uLineWeight.value = clampedWeight;
  plotterStyleUniforms.uJitter.value = normalizedJitter;

  // Adjust optical ink opacity for sub-pixel weights (< 1.0) and boost secondary lines at heavy weights
  const weightOpacityFactor = THREE.MathUtils.clamp(clampedWeight, 0.45, 1.25);
  sharedPrimaryEdgeMaterial.opacity = THREE.MathUtils.clamp(
    0.85 * weightOpacityFactor,
    0.45,
    1.0
  );
  sharedSecondaryEdgeMaterial.opacity = THREE.MathUtils.clamp(
    0.65 * weightOpacityFactor,
    0.3,
    0.95
  );
  sharedAccentEdgeMaterial.opacity = THREE.MathUtils.clamp(
    0.82 * weightOpacityFactor,
    0.4,
    1.0
  );

  sharedPrimaryEdgeMaterial.linewidth = clampedWeight;
  sharedSecondaryEdgeMaterial.linewidth = Math.max(0.5, clampedWeight * 0.8);
  sharedAccentEdgeMaterial.linewidth = clampedWeight;
}

/**
 * Updates all plotter pen, shading, depth, lens, multi-pen, and paper theme uniforms & materials.
 */
export function applyPlotterEffects(
  params: Partial<CameraParameters>
): PaperThemePalette {
  const merged = { ...DEFAULT_CAMERA_PARAMS, ...params };
  applyPlotterLineStyle(merged.lineWeight, merged.lineJitter);

  plotterStyleUniforms.uManualSketch.value = THREE.MathUtils.clamp(
    (merged.manualSketch ?? 0) / 100,
    0,
    1
  );
  plotterStyleUniforms.uOvershoot.value = THREE.MathUtils.clamp(
    merged.cornerOvershoot / 100,
    0,
    1
  );
  plotterStyleUniforms.uInkPooling.value = THREE.MathUtils.clamp(
    merged.inkPooling / 100,
    0,
    1
  );
  plotterStyleUniforms.uInkDropout.value = THREE.MathUtils.clamp(
    merged.inkDropout / 100,
    0,
    1
  );
  plotterStyleUniforms.uSketchPasses.value = THREE.MathUtils.clamp(
    merged.sketchPasses,
    1,
    4
  );
  plotterStyleUniforms.uHatchDensity.value = THREE.MathUtils.clamp(
    merged.hatchDensity / 100,
    0,
    1
  );
  plotterStyleUniforms.uStippleShade.value = THREE.MathUtils.clamp(
    merged.stippleShade / 100,
    0,
    1
  );
  plotterStyleUniforms.uDepthTaper.value = THREE.MathUtils.clamp(
    merged.depthTaper / 100,
    0,
    1
  );
  plotterStyleUniforms.uDofBlur.value = THREE.MathUtils.clamp(
    merged.dofBlur / 100,
    0,
    1
  );
  plotterStyleUniforms.uFocalDistance.value = Math.max(5, merged.lookAhead);
  plotterStyleUniforms.uPenMisregistration.value = THREE.MathUtils.clamp(
    merged.penMisregistration,
    0,
    8
  );
  plotterStyleUniforms.uLensCurvature.value = THREE.MathUtils.clamp(
    merged.lensCurvature / 100,
    -1,
    1
  );
  const normalizedPointsDensity = THREE.MathUtils.clamp(
    (merged.pointsDensity ?? 25) / 100,
    0,
    1
  );
  plotterStyleUniforms.uPointsDensity.value = normalizedPointsDensity;
  plotterStyleUniforms.uPointSize.value = Math.max(
    3.5,
    (merged.lineWeight ?? 1.2) * 3.8 * (0.85 + 0.55 * normalizedPointsDensity)
  );

  const palette =
    PAPER_THEME_PALETTES[merged.paperTheme] || PAPER_THEME_PALETTES.cream;

  sharedOccluderMaterial.color.setHex(palette.paperBgHex);
  sharedRoadOccluderMaterial.color.setHex(palette.roadFillHex);
  sharedPrimaryEdgeMaterial.color.setHex(palette.primaryInkHex);
  sharedSecondaryEdgeMaterial.color.setHex(palette.secondaryInkHex);
  sharedAccentEdgeMaterial.color.setHex(palette.accentInkHex);

  plotterStyleUniforms.uPaperColor.value.setHex(palette.paperBgHex);
  plotterStyleUniforms.uInkColor.value.setHex(palette.primaryInkHex);
  plotterStyleUniforms.uSecondPenColor.value.setHex(palette.secondPenHex);
  plotterStyleUniforms.uDistantGradient.value = merged.distantGradient
    ? 1.0
    : 0.0;
  plotterStyleUniforms.uGradientHorizonColor.value.setHex(
    palette.gradientHorizonHex
  );
  plotterStyleUniforms.uGradientZenithColor.value.setHex(
    palette.gradientZenithHex
  );

  return palette;
}

export interface PlotterMeshOptions {
  /** Threshold angle in degrees for EdgesGeometry (default: 15) */
  thresholdAngle?: number;
  /** Line style tier */
  inkWeight?: 'primary' | 'secondary' | 'accent';
  /** Surface role */
  surfaceType?: 'building' | 'road' | 'detail';
}

/**
 * Method 1 (Three.js built-in): Uses EdgesGeometry and LineSegments to render model outlines,
 * paired with a polygon-offset occluder mesh for architectural hidden-line removal.
 */
export function createPlotterMesh(
  geometry: THREE.BufferGeometry,
  options: PlotterMeshOptions = {}
): THREE.Group {
  const {
    thresholdAngle = 15,
    inkWeight = 'primary',
    surfaceType = 'building',
  } = options;

  const group = new THREE.Group();

  // Occluder mesh (no lighting or textures)
  const fillMat =
    surfaceType === 'road' ? sharedRoadOccluderMaterial : sharedOccluderMaterial;
  const occluder = new THREE.Mesh(geometry, fillMat);
  occluder.renderOrder = 1;
  occluder.userData.isOccluder = true;
  occluder.userData.defaultMaterial = fillMat;
  occluder.userData.normalMaterial = sharedNormalMaterial;
  group.add(occluder);

  // Wireframe outline via EdgesGeometry + LineSegments
  const edgesGeometry = new THREE.EdgesGeometry(geometry, thresholdAngle);
  enrichLineSegmentsGeometry(edgesGeometry);
  const lineMat =
    inkWeight === 'secondary'
      ? sharedSecondaryEdgeMaterial
      : inkWeight === 'accent'
        ? sharedAccentEdgeMaterial
        : sharedPrimaryEdgeMaterial;

  const lineSegments = new THREE.LineSegments(edgesGeometry, lineMat);
  lineSegments.renderOrder = 2;
  lineSegments.userData.isEdgeLine = true;
  group.add(lineSegments);

  return group;
}

/**
 * Creates a crisp LineSegments object from pairs of vertices (for road markings, window mullions, etc.)
 */
export function createPlotterSegments(
  points: THREE.Vector3[],
  inkWeight: 'primary' | 'secondary' = 'primary'
): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  enrichLineSegmentsGeometry(geometry);
  const material =
    inkWeight === 'secondary'
      ? sharedSecondaryEdgeMaterial
      : sharedPrimaryEdgeMaterial;
  const segments = new THREE.LineSegments(geometry, material);
  segments.renderOrder = 2;
  segments.userData.isEdgeLine = true;
  return segments;
}

/**
 * Tags a 3D object and all of its descendant meshes/segments with a progressive
 * `pointsThreshold` (0..100) controlled by the Object & Mesh Detail slider.
 */
export function tagObjectDetail<T extends THREE.Object3D>(
  obj: T,
  threshold: number
): T {
  obj.userData.pointsThreshold = threshold;
  obj.traverse((child) => {
    child.userData.pointsThreshold = threshold;
  });
  return obj;
}

/**
 * Creates a 3D wireframe target reticle on the street surface to visualize the `Look ahead m` target point.
 */
export function createTargetReticle(): THREE.Group {
  const group = new THREE.Group();
  const points: THREE.Vector3[] = [];

  // Outer diamond ring on the street plane
  const r = 1.6;
  points.push(
    new THREE.Vector3(0, 0, -r),
    new THREE.Vector3(r, 0, 0),
    new THREE.Vector3(r, 0, 0),
    new THREE.Vector3(0, 0, r),
    new THREE.Vector3(0, 0, r),
    new THREE.Vector3(-r, 0, 0),
    new THREE.Vector3(-r, 0, 0),
    new THREE.Vector3(0, 0, -r)
  );

  // Inner square
  const s = 0.65;
  points.push(
    new THREE.Vector3(-s, 0, -s),
    new THREE.Vector3(s, 0, -s),
    new THREE.Vector3(s, 0, -s),
    new THREE.Vector3(s, 0, s),
    new THREE.Vector3(s, 0, s),
    new THREE.Vector3(-s, 0, s),
    new THREE.Vector3(-s, 0, s),
    new THREE.Vector3(-s, 0, -s)
  );

  // Crosshair ticks + vertical pin
  const c = 2.4;
  points.push(
    new THREE.Vector3(-c, 0, 0),
    new THREE.Vector3(c, 0, 0),
    new THREE.Vector3(0, 0, -c),
    new THREE.Vector3(0, 0, c),
    new THREE.Vector3(0, -1.4, 0),
    new THREE.Vector3(0, 1.4, 0)
  );

  const segments = createPlotterSegments(points, 'primary');
  segments.userData.alwaysVisibleInSobel = true;
  group.add(segments);
  return group;
}

/**
 * Updates the scene hierarchy materials/visibility when switching between:
 * - 'edges-occluded' (Method 1: EdgesGeometry + white hidden-line occlusion)
 * - 'edges-wireframe' (Method 1b: Pure transparent EdgesGeometry wireframe)
 * - 'sobel-post' (Method 2: Post-processing Sobel edge detection shader)
 */
export function applyRenderModeToScene(
  scene: THREE.Scene,
  mode: RenderMode
): void {
  scene.traverse((obj) => {
    if (obj.userData.hiddenByDetail) {
      obj.visible = false;
      return;
    }
    if (obj.userData.isOccluder && obj instanceof THREE.Mesh) {
      if (mode === 'edges-wireframe') {
        obj.visible = false;
      } else if (mode === 'sobel-post') {
        obj.visible = true;
        obj.material = obj.userData.normalMaterial;
      } else {
        obj.visible = true;
        obj.material = obj.userData.defaultMaterial;
      }
    } else if (obj.userData.isEdgeLine) {
      obj.visible =
        mode !== 'sobel-post' || Boolean(obj.userData.alwaysVisibleInSobel);
    } else if (obj.userData.isPlotterPoints) {
      obj.visible = true;
    }
  });
}

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CameraParameters, DEFAULT_CAMERA_PARAMS } from '../types/cameraTypes';
import { PAPER_THEME_PALETTES } from './plotterMaterial';

/**
 * Unified Plotter Post-Processing Shader supporting:
 * - uMode = 0.0 (Method 1: EdgesGeometry + LineSegments with radial ink dilation, wave jitter,
 *   corner overshoot, ink pooling, dry-pen dropout, multi-pass sketch, DOF blur, and 2-pen misregistration)
 * - uMode = 1.0 (Method 2: Sobel Edge Detection + procedural normal-based cross-hatching & stippling)
 */
export const PlotterSobelShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    resolution: { value: new THREE.Vector2(1024, 768) },
    uMode: { value: 0.0 },
    uLineWeight: { value: 1.2 },
    uJitter: { value: 0.0 },
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
    uDistantGradient: { value: 0.0 },
    uPaperColor: { value: new THREE.Color(0xfaf8f2) },
    uInkColor: { value: new THREE.Color(0x111111) },
    uSecondPenColor: { value: new THREE.Color(0xc8321e) },
    uGradientHorizonColor: { value: new THREE.Color(0xf6c28b) },
    uGradientZenithColor: { value: new THREE.Color(0xd97b73) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float uMode;
    uniform float uLineWeight;
    uniform float uJitter;
    uniform float uOvershoot;
    uniform float uInkPooling;
    uniform float uInkDropout;
    uniform float uSketchPasses;
    uniform float uHatchDensity;
    uniform float uStippleShade;
    uniform float uDepthTaper;
    uniform float uDofBlur;
    uniform float uFocalDistance;
    uniform float uPenMisregistration;
    uniform float uDistantGradient;
    uniform vec3 uPaperColor;
    uniform vec3 uInkColor;
    uniform vec3 uSecondPenColor;
    uniform vec3 uGradientHorizonColor;
    uniform vec3 uGradientZenithColor;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Theme-independent ink extraction (works for both dark-on-light and light-on-dark themes,
    // and ignores distant background gradient tints on occluder surfaces)
    float extractInk(vec4 c) {
      if (c.a < 0.03) return 0.0;
      float dPaper = length(c.rgb - uPaperColor);
      if (uDistantGradient > 0.5) {
        vec3 gMid = mix(uGradientHorizonColor, uGradientZenithColor, 0.5);
        dPaper = min(dPaper, length(c.rgb - uGradientHorizonColor));
        dPaper = min(dPaper, length(c.rgb - uGradientZenithColor));
        dPaper = min(dPaper, length(c.rgb - gMid));
        dPaper = min(dPaper, length(c.rgb - mix(uPaperColor, gMid, 0.5)));
      }
      float dInk = length(c.rgb - uInkColor);
      float ratio = clamp(dPaper / max(0.05, dPaper + dInk), 0.0, 1.0);
      return c.a * smoothstep(0.12, 0.58, ratio);
    }

    // Evaluates Sobel edge intensity at a given UV coordinate (used in uMode = 1.0)
    float sampleSobelEdge(vec2 sampleUv, vec2 stepTexel, float lowThresh, float highThresh) {
      vec4 c00 = texture2D(tDiffuse, sampleUv + stepTexel * vec2(-1.0, -1.0));
      vec4 c01 = texture2D(tDiffuse, sampleUv + stepTexel * vec2(-1.0,  0.0));
      vec4 c02 = texture2D(tDiffuse, sampleUv + stepTexel * vec2(-1.0,  1.0));
      vec4 c10 = texture2D(tDiffuse, sampleUv + stepTexel * vec2( 0.0, -1.0));
      vec4 c12 = texture2D(tDiffuse, sampleUv + stepTexel * vec2( 0.0,  1.0));
      vec4 c20 = texture2D(tDiffuse, sampleUv + stepTexel * vec2( 1.0, -1.0));
      vec4 c21 = texture2D(tDiffuse, sampleUv + stepTexel * vec2( 1.0,  0.0));
      vec4 c22 = texture2D(tDiffuse, sampleUv + stepTexel * vec2( 1.0,  1.0));

      vec3 gx = -1.0 * c00.rgb - 2.0 * c01.rgb - 1.0 * c02.rgb
                + 1.0 * c20.rgb + 2.0 * c21.rgb + 1.0 * c22.rgb;
      vec3 gy = -1.0 * c00.rgb - 2.0 * c10.rgb - 1.0 * c20.rgb
                + 1.0 * c02.rgb + 2.0 * c12.rgb + 1.0 * c22.rgb;
      float gradColor = length(gx) + length(gy);

      float ax = -1.0 * c00.a - 2.0 * c01.a - 1.0 * c02.a
                 + 1.0 * c20.a + 2.0 * c21.a + 1.0 * c22.a;
      float ay = -1.0 * c00.a - 2.0 * c10.a - 1.0 * c20.a
                 + 1.0 * c02.a + 2.0 * c12.a + 1.0 * c22.a;
      float gradAlpha = sqrt(ax * ax + ay * ay);

      return smoothstep(lowThresh, highThresh, max(gradColor, gradAlpha * 1.4));
    }

    float sampleStrokeAt(vec2 sampleUv, vec2 texel, float weightScale) {
      if (uMode < 0.5) {
        return extractInk(texture2D(tDiffuse, sampleUv));
      } else {
        float stepScale = clamp(weightScale * 0.85, 0.5, 3.6);
        float lowThresh = clamp(0.28 - (weightScale - 1.0) * 0.04, 0.1, 0.35);
        float highThresh = clamp(0.62 - (weightScale - 1.0) * 0.06, 0.25, 0.75);
        return sampleSobelEdge(sampleUv, texel * stepScale, lowThresh, highThresh);
      }
    }

    void main() {
      vec2 texel = vec2(1.0 / max(1.0, resolution.x), 1.0 / max(1.0, resolution.y));

      // 1. Hand-drawn / mechanical wave jitter along strokes
      vec2 uv = vUv;
      if (uJitter > 0.001) {
        float aspect = resolution.x / max(1.0, resolution.y);
        vec2 p = vec2(uv.x * aspect, uv.y);

        float w1x = sin(p.y * 58.0 + p.x * 21.0) + 0.5 * cos(p.y * 155.0 - p.x * 92.0);
        float w1y = cos(p.x * 58.0 - p.y * 25.0) + 0.5 * sin(p.x * 155.0 + p.y * 86.0);
        float w2x = sin(p.y * 330.0 + p.x * 250.0) * 0.3;
        float w2y = cos(p.x * 330.0 - p.y * 250.0) * 0.3;

        vec2 disp = vec2(w1x + w2x, w1y + w2y) * (uJitter * 0.0036);
        uv = clamp(uv + disp, vec2(0.001), vec2(0.999));
      }

      // 2. Depth Taper factor (perspective horizon sits near upper-middle of viewport)
      float horizonProximity = smoothstep(0.15, 0.82, uv.y);
      float effectiveWeight = uLineWeight * mix(1.0, max(0.38, 1.0 - horizonProximity * 0.72), uDepthTaper);

      // 3. Base stroke evaluation + Line Weight radial dilation (Method 1) or Sobel (Method 2)
      vec4 baseSample = texture2D(tDiffuse, uv);
      float strokeInk = sampleStrokeAt(uv, texel, effectiveWeight);

      if (uMode < 0.5 && effectiveWeight > 1.02) {
        float radiusPx = (effectiveWeight - 1.0) * 0.92;
        for (int i = 0; i < 12; i++) {
          float angle = float(i) * 0.5235987756;
          vec2 dir = vec2(cos(angle), sin(angle)) * texel;
          strokeInk = max(strokeInk, extractInk(texture2D(tDiffuse, uv + dir * (radiusPx * 0.52))) * 0.96);
          strokeInk = max(strokeInk, extractInk(texture2D(tDiffuse, uv + dir * radiusPx)) * 0.85);
        }
      } else if (uMode < 0.5 && effectiveWeight < 0.98) {
        strokeInk *= clamp(effectiveWeight, 0.35, 1.0);
      }

      // 4. Multi-Pass Fineliner Sketch (1..4 overlapping ghosted passes)
      if (uSketchPasses > 1.05) {
        float p2 = sin(uv.y * 95.0) * 1.4;
        vec2 off2 = vec2(1.35 + p2 * 0.35, -1.15) * texel;
        strokeInk = max(strokeInk, sampleStrokeAt(uv + off2, texel, effectiveWeight * 0.85) * 0.65);

        if (uSketchPasses > 2.05) {
          float p3 = cos(uv.x * 110.0) * 1.5;
          vec2 off3 = vec2(-1.65, 1.45 + p3 * 0.35) * texel;
          strokeInk = max(strokeInk, sampleStrokeAt(uv + off3, texel, effectiveWeight * 0.8) * 0.55);
        }
        if (uSketchPasses > 3.05) {
          vec2 off4 = vec2(2.3, 1.9) * texel;
          strokeInk = max(strokeInk, sampleStrokeAt(uv + off4, texel, effectiveWeight * 0.75) * 0.48);
        }
      }

      // 5. Corner Overshoot / Architectural Tick Extensions
      if (uOvershoot > 0.001) {
        float reach = 2.0 + uOvershoot * 5.5;
        // Extend horizontal and vertical architectural segments past their endpoints
        float hPos = min(
          sampleStrokeAt(uv + vec2(texel.x * reach * 0.5, 0.0), texel, 1.0),
          sampleStrokeAt(uv + vec2(texel.x * reach, 0.0), texel, 1.0)
        );
        float hNeg = min(
          sampleStrokeAt(uv - vec2(texel.x * reach * 0.5, 0.0), texel, 1.0),
          sampleStrokeAt(uv - vec2(texel.x * reach, 0.0), texel, 1.0)
        );
        float vPos = min(
          sampleStrokeAt(uv + vec2(0.0, texel.y * reach * 0.5), texel, 1.0),
          sampleStrokeAt(uv + vec2(0.0, texel.y * reach), texel, 1.0)
        );
        float vNeg = min(
          sampleStrokeAt(uv - vec2(0.0, texel.y * reach * 0.5), texel, 1.0),
          sampleStrokeAt(uv - vec2(0.0, texel.y * reach), texel, 1.0)
        );
        float tickOvershoot = max(max(hPos, hNeg), max(vPos, vNeg)) * (0.55 + 0.35 * uOvershoot);
        strokeInk = max(strokeInk, tickOvershoot);
      }

      // 6. Ink Pooling at Line Intersections & Paper Fiber Bleed
      if (uInkPooling > 0.001) {
        float rad = (1.4 + uInkPooling * 2.4);
        float nL = sampleStrokeAt(uv + vec2(-texel.x * rad, 0.0), texel, 1.0);
        float nR = sampleStrokeAt(uv + vec2( texel.x * rad, 0.0), texel, 1.0);
        float nU = sampleStrokeAt(uv + vec2(0.0,  texel.y * rad), texel, 1.0);
        float nD = sampleStrokeAt(uv + vec2(0.0, -texel.y * rad), texel, 1.0);
        float hActivity = max(nL, nR);
        float vActivity = max(nU, nD);
        // High where horizontal and vertical strokes intersect at corners
        float intersectionPool = sqrt(hActivity * vActivity) * uInkPooling * 1.15;
        float grain = hash12(floor(gl_FragCoord.xy * 0.8));
        float paperBleed = max(hActivity, vActivity) * step(1.0 - uInkPooling * 0.45, grain) * 0.65;
        strokeInk = clamp(max(strokeInk, intersectionPool) + paperBleed * uInkPooling, 0.0, 1.0);
      }

      // 7. Depth-of-Field Focus Dispersion Blur (tied to Look ahead m focal distance)
      if (uDofBlur > 0.001) {
        float focalScreenY = clamp(0.24 + (uFocalDistance / 180.0) * 0.48, 0.18, 0.82);
        float coc = abs(uv.y - focalScreenY) * uDofBlur * 2.4;
        if (coc > 0.02) {
          float blurRad = coc * 5.2;
          float blurredInk = strokeInk * 0.35;
          for (int k = 0; k < 6; k++) {
            float a = float(k) * 1.04719755;
            vec2 bOff = vec2(cos(a), sin(a)) * texel * blurRad;
            blurredInk += sampleStrokeAt(uv + bOff, texel, effectiveWeight) * 0.14;
          }
          strokeInk = mix(strokeInk, clamp(blurredInk, 0.0, 1.0), clamp(coc * 1.3, 0.0, 0.92));
        }
      }

      // 8. Surface Cross-Hatching & Stippling in Sobel Mode (uMode > 0.5)
      if (uMode > 0.5 && baseSample.a > 0.1 && (uHatchDensity > 0.001 || uStippleShade > 0.001)) {
        // MeshNormalMaterial encodes normal X in R, Y in G, Z in B
        vec3 nrm = normalize(baseSample.rgb * 2.0 - 1.0);
        float wallShade = clamp(0.75 - (nrm.y * 0.65 + nrm.x * 0.25), 0.0, 1.0);
        if (abs(nrm.y) > 0.82) wallShade *= 0.15;

        if (uHatchDensity > 0.001 && wallShade > 0.2) {
          float pitch = mix(9.0, 3.8, uHatchDensity);
          float d1 = abs(fract((gl_FragCoord.x + gl_FragCoord.y) / pitch) - 0.5);
          float lw = 0.12 + 0.12 * uHatchDensity;
          float h1 = (1.0 - smoothstep(lw * 0.6, lw, d1)) * smoothstep(0.2, 0.45, wallShade);
          strokeInk = max(strokeInk, h1 * 0.82);

          if (wallShade > 0.48) {
            float d2 = abs(fract((gl_FragCoord.x - gl_FragCoord.y) / pitch) - 0.5);
            float h2 = (1.0 - smoothstep(lw * 0.6, lw, d2)) * smoothstep(0.48, 0.78, wallShade);
            strokeInk = max(strokeInk, h2 * 0.82);
          }
        }

        if (uStippleShade > 0.001 && wallShade > 0.15) {
          float rnd = hash12(floor(gl_FragCoord.xy / 2.2));
          if (rnd < wallShade * uStippleShade * 0.82) {
            strokeInk = max(strokeInk, 0.78);
          }
        }
      }

      // 9. Dry Pen Stipple Dropout
      if (uInkDropout > 0.001 && strokeInk > 0.02) {
        float dropNoise = hash12(floor(gl_FragCoord.xy * 0.65));
        if (dropNoise < uInkDropout * 0.68) {
          strokeInk *= 0.08;
        }
      }

      // 10. Atmospheric Depth Contrast Taper
      if (uDepthTaper > 0.001) {
        strokeInk *= mix(1.0, 1.0 - horizonProximity * 0.72, uDepthTaper);
      }

      // 11. 2-Pen Plotter Color Misregistration Offset
      float secondPenInk = 0.0;
      if (uPenMisregistration > 0.05) {
        vec2 pen2Offset = vec2(uPenMisregistration, -uPenMisregistration * 0.65) * texel;
        secondPenInk = sampleStrokeAt(uv - pen2Offset, texel, effectiveWeight * 0.9) * 0.78;
      }

      float maxStroke = max(strokeInk, secondPenInk);
      if (baseSample.a < 0.05 && maxStroke < 0.05) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }

      vec3 surfaceRgb = (uMode < 0.5 && baseSample.a > 0.05) ? baseSample.rgb : uPaperColor;
      if (uMode > 0.5 && uDistantGradient > 0.5 && baseSample.a > 0.05) {
        vec3 gradRgb = mix(uGradientHorizonColor, uGradientZenithColor, smoothstep(0.35, 0.95, uv.y));
        surfaceRgb = mix(surfaceRgb, gradRgb, horizonProximity * 0.78);
      }
      vec3 compositedRgb = mix(surfaceRgb, uSecondPenColor, clamp(secondPenInk, 0.0, 1.0));
      compositedRgb = mix(compositedRgb, uInkColor, clamp(strokeInk, 0.0, 1.0));

      float finalAlpha = max(baseSample.a * (uMode > 0.5 ? 0.92 : 1.0), clamp(maxStroke * 1.1, 0.0, 1.0));
      gl_FragColor = vec4(compositedRgb, finalAlpha);
    }
  `,
};

export interface SobelPipeline {
  composer: EffectComposer;
  sobelPass: ShaderPass;
  setSize: (width: number, height: number, pixelRatio: number) => void;
  setStyleUniforms: (
    isSobelMode: boolean,
    lineWeight: number,
    lineJitterPercent: number,
    fullParams?: Partial<CameraParameters>
  ) => void;
}

export function createSobelPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): SobelPipeline {
  const renderTarget = new THREE.WebGLRenderTarget(800, 600, {
    format: THREE.RGBAFormat,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(scene, camera);
  renderPass.clearAlpha = 0;
  composer.addPass(renderPass);

  const sobelPass = new ShaderPass(PlotterSobelShader);
  composer.addPass(sobelPass);

  const setSize = (width: number, height: number, pixelRatio: number) => {
    composer.setSize(width, height);
    composer.setPixelRatio(pixelRatio);
    sobelPass.uniforms.resolution.value.set(
      width * pixelRatio,
      height * pixelRatio
    );
  };

  const setStyleUniforms = (
    isSobelMode: boolean,
    lineWeight: number,
    lineJitterPercent: number,
    fullParams?: Partial<CameraParameters>
  ) => {
    const merged = { ...DEFAULT_CAMERA_PARAMS, ...fullParams };
    const palette =
      PAPER_THEME_PALETTES[merged.paperTheme] || PAPER_THEME_PALETTES.cream;

    sobelPass.uniforms.uMode.value = isSobelMode ? 1.0 : 0.0;
    sobelPass.uniforms.uLineWeight.value = THREE.MathUtils.clamp(
      lineWeight,
      0.4,
      5.0
    );
    sobelPass.uniforms.uJitter.value = THREE.MathUtils.clamp(
      lineJitterPercent / 100,
      0.0,
      1.0
    );
    sobelPass.uniforms.uOvershoot.value = THREE.MathUtils.clamp(
      merged.cornerOvershoot / 100,
      0.0,
      1.0
    );
    sobelPass.uniforms.uInkPooling.value = THREE.MathUtils.clamp(
      merged.inkPooling / 100,
      0.0,
      1.0
    );
    sobelPass.uniforms.uInkDropout.value = THREE.MathUtils.clamp(
      merged.inkDropout / 100,
      0.0,
      1.0
    );
    sobelPass.uniforms.uSketchPasses.value = THREE.MathUtils.clamp(
      merged.sketchPasses,
      1.0,
      4.0
    );
    sobelPass.uniforms.uHatchDensity.value = THREE.MathUtils.clamp(
      merged.hatchDensity / 100,
      0.0,
      1.0
    );
    sobelPass.uniforms.uStippleShade.value = THREE.MathUtils.clamp(
      merged.stippleShade / 100,
      0.0,
      1.0
    );
    sobelPass.uniforms.uDepthTaper.value = THREE.MathUtils.clamp(
      merged.depthTaper / 100,
      0.0,
      1.0
    );
    sobelPass.uniforms.uDofBlur.value = THREE.MathUtils.clamp(
      merged.dofBlur / 100,
      0.0,
      1.0
    );
    sobelPass.uniforms.uFocalDistance.value = Math.max(5.0, merged.lookAhead);
    sobelPass.uniforms.uPenMisregistration.value = THREE.MathUtils.clamp(
      merged.penMisregistration,
      0.0,
      8.0
    );
    sobelPass.uniforms.uDistantGradient.value = merged.distantGradient
      ? 1.0
      : 0.0;

    sobelPass.uniforms.uPaperColor.value.setHex(palette.paperBgHex);
    sobelPass.uniforms.uInkColor.value.setHex(palette.primaryInkHex);
    sobelPass.uniforms.uSecondPenColor.value.setHex(palette.secondPenHex);
    sobelPass.uniforms.uGradientHorizonColor.value.setHex(
      palette.gradientHorizonHex
    );
    sobelPass.uniforms.uGradientZenithColor.value.setHex(
      palette.gradientZenithHex
    );
  };

  return { composer, sobelPass, setSize, setStyleUniforms };
}

export type RenderMode = 'edges-occluded' | 'edges-wireframe' | 'sobel-post';

export type PaperTheme = 'cream' | 'blueprint' | 'terminal' | 'vellum';

export type EasingType =
  | 'easeInOutCubic'
  | 'easeOutQuart'
  | 'easeInOutSine'
  | 'overshoot'
  | 'linear';

export interface TransitionSettings {
  /** Whether clicking presets smoothly animates instead of jumping */
  animateOnPreset: boolean;
  /** Render the 3D transition trajectory, sightlines, and ghost frustums in the viewport */
  showTrajectory3D: boolean;
  /** Elevate viewport camera to an external 3/4 observer angle to watch the 3D camera rig animate */
  observerMode: boolean;
  /** Transition duration in seconds (0.4..8.0) */
  duration: number;
  /** Interpolation easing curve */
  easing: EasingType;
  /** Loop transition animation continuously */
  loop: boolean;
}

export const DEFAULT_TRANSITION_SETTINGS: TransitionSettings = {
  animateOnPreset: true,
  showTrajectory3D: true,
  observerMode: false,
  duration: 2.4,
  easing: 'easeInOutCubic',
  loop: false,
};

export interface CameraParameters {
  /** Camera height m (Affects camera Y position) */
  cameraHeight: number;
  /** Pitch ° (Affects camera X rotation) */
  pitch: number;
  /** Turn ° (Affects camera Y rotation) */
  turn: number;
  /** Field of view ° (Affects camera FOV) */
  fov: number;
  /** Look ahead m (Determines the target point the camera looks at) */
  lookAhead: number;
  /** Camera along % (Translates the camera along the street axis - Z axis) */
  cameraAlong: number;
  /** Camera side % (Translates the camera perpendicular to the street axis - X axis) */
  cameraSide: number;
  /** Overall architectural detail level % (cornices, fire escapes, awnings, rooftop structures) */
  buildingDetail: number;
  /** Window detail & density % (3D sills, lintels, casements, sash bars, side-wall windows) */
  windowDensity: number;
  /** Balcony density % (3D projecting balconies, railings, balusters, brackets) */
  balconyDensity: number;
  /** Object micro-details and 3D coordinate point cloud density % (0..100) */
  pointsDensity: number;
  /** Plotter line width / stroke weight in px (0.4..5.0) */
  lineWeight: number;
  /** Plotter hand-drawn / mechanical line jitter % (0..100) */
  lineJitter: number;
  /** Architectural corner tick overshoot % (0..100) */
  cornerOvershoot: number;
  /** Fountain pen vertex ink pooling & paper bleed % (0..100) */
  inkPooling: number;
  /** Dry pen stipple / stroke dropout % (0..100) */
  inkDropout: number;
  /** Multi-pass overlapping fineliner sketch strokes (1..4) */
  sketchPasses: number;
  /** 45° directional facade cross-hatching density % (0..100) */
  hatchDensity: number;
  /** Surface stippling / halftone dot shading % (0..100) */
  stippleShade: number;
  /** Atmospheric depth line weight & contrast taper % (0..100) */
  depthTaper: number;
  /** Depth-of-field focus blur tied to Look ahead m distance % (0..100) */
  dofBlur: number;
  /** 2-Pen plotter color misregistration offset in px (0..8) */
  penMisregistration: number;
  /** Drafting paper & ink palette theme */
  paperTheme: PaperTheme;
  /** Curvilinear / fisheye barrel lens curvature % (-100..100) */
  lensCurvature: number;
  /** Perspective-to-Orthographic axonometric projection blend % (0..100) */
  orthoBlend: number;
  /** Rendering style mode */
  renderMode: RenderMode;
  /** Show 3D wireframe look-ahead target reticle on the street */
  showTargetMarker: boolean;
  /** Animate vehicles & pedestrians along the street */
  animateScene: boolean;
}

export interface StreetBounds {
  /** Z coordinate at 0% along the street */
  startZ: number;
  /** Z coordinate at 100% along the street */
  endZ: number;
  /** Half-width of navigable street canyon in meters (100% side offset) */
  halfWidthX: number;
  /** Reference street target elevation in meters */
  targetElevation: number;
}

export const DEFAULT_STREET_BOUNDS: StreetBounds = {
  startZ: 150,
  endZ: -190,
  halfWidthX: 10.5,
  targetElevation: 1.5,
};

export const DEFAULT_CAMERA_PARAMS: CameraParameters = {
  cameraHeight: 16,
  pitch: 0,
  turn: 0,
  fov: 50,
  lookAhead: 65,
  cameraAlong: 12,
  cameraSide: 0,
  buildingDetail: 85,
  windowDensity: 85,
  balconyDensity: 75,
  pointsDensity: 25,
  lineWeight: 1.2,
  lineJitter: 0,
  cornerOvershoot: 0,
  inkPooling: 0,
  inkDropout: 0,
  sketchPasses: 1,
  hatchDensity: 0,
  stippleShade: 0,
  depthTaper: 0,
  dofBlur: 0,
  penMisregistration: 0,
  paperTheme: 'cream',
  lensCurvature: 0,
  orthoBlend: 0,
  renderMode: 'edges-occluded',
  showTargetMarker: true,
  animateScene: false,
};

export interface CameraPreset {
  name: string;
  description: string;
  params: Partial<CameraParameters>;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    name: 'Canyon Overview',
    description: 'Elevated central perspective down the street canyon',
    params: {
      cameraHeight: 16,
      pitch: 0,
      turn: 0,
      fov: 50,
      lookAhead: 65,
      cameraAlong: 12,
      cameraSide: 0,
    },
  },
  {
    name: 'Pedestrian Eye-Level',
    description: 'Right sidewalk viewpoint looking up at balconies and windows',
    params: {
      cameraHeight: 1.8,
      pitch: 10,
      turn: -15,
      fov: 60,
      lookAhead: 45,
      cameraAlong: 28,
      cameraSide: 82,
    },
  },
  {
    name: 'Rooftop Bird-Eye',
    description: 'High altitude architectural axonometric-style view',
    params: {
      cameraHeight: 62,
      pitch: -8,
      turn: 14,
      fov: 38,
      lookAhead: 85,
      cameraAlong: 8,
      cameraSide: -45,
    },
  },
  {
    name: 'Telephoto Compression',
    description: 'Narrow FOV deep street canyon perspective',
    params: {
      cameraHeight: 11,
      pitch: 2,
      turn: 0,
      fov: 24,
      lookAhead: 120,
      cameraAlong: 5,
      cameraSide: -18,
    },
  },
];

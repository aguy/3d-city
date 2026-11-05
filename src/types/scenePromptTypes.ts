import { CameraParameters, PaperTheme, RenderMode } from './cameraTypes';

export type SceneArchetype =
  | 'canyon'
  | 'boulevard'
  | 'canal'
  | 'monorail'
  | 'tokyo-alley'
  | 'brutalist'
  | 'gothic-historic'
  | 'cyberpunk'
  | 'amsterdam'
  | 'construction';

export type GroundType =
  | 'standard-road'
  | 'canal-water'
  | 'boulevard'
  | 'cobblestone-alley'
  | 'monorail-highway';

export type BuildingStyle =
  | 'modern-canyon'
  | 'haussmann'
  | 'brutalist'
  | 'neo-tokyo'
  | 'sci-fi-spires'
  | 'gothic-historic'
  | 'amsterdam-gabled'
  | 'scaffold-frame';

export interface SceneDescriptor {
  archetype: SceneArchetype;
  name: string;
  description: string;
  groundType: GroundType;
  buildingStyle: BuildingStyle;
  buildingHeights: {
    min: number;
    max: number;
    variance: number;
  };
  streetWidth: number; // primary width (road or canal)
  sidewalkWidth: number;
  hasCanalBridges?: boolean;
  hasSkybridges?: boolean;
  hasMonorailTrack?: boolean;
  hasTrees?: boolean;
  hasStreetAwnings?: boolean;
  hasAntennaSpires?: boolean;
  hasCranes?: boolean;
  propDensity: {
    trees: number; // 0..1
    lamps: number; // 0..1
    vehicles: number; // 0..1
    pedestrians: number; // 0..1
    overheads: number; // 0..1
  };
  recommendedStyle: {
    paperTheme: PaperTheme;
    renderMode: RenderMode;
    lineWeight: number;
    lineJitter: number;
    hatchDensity: number;
    stippleShade: number;
    cornerOvershoot: number;
    windowDensity: number;
    balconyDensity: number;
    buildingDetail: number;
  };
  recommendedCamera: Partial<CameraParameters>;
}

export interface PromptSuggestion {
  id: string;
  emoji: string;
  label: string;
  prompt: string;
}

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: 'haussmann',
    emoji: '🏛️',
    label: 'Haussmann Boulevard',
    prompt:
      'Tree-lined Parisian avenue with grand mansard roofs, stone balconies, and wide pedestrian walkways',
  },
  {
    id: 'canal',
    emoji: '🚤',
    label: 'Venetian Canal',
    prompt:
      'Picturesque water canal flanked by classic facades, arched footbridges, mooring posts, and gentle boats',
  },
  {
    id: 'cyberpunk',
    emoji: '🌆',
    label: 'Cyberpunk Canyon',
    prompt:
      'Futuristic vertical metropolis with illuminated skybridges, overhead conduit gantries, and dense antenna spires',
  },
  {
    id: 'tokyo-alley',
    emoji: '🏮',
    label: 'Neo-Tokyo Back-Alley',
    prompt:
      'Intimate narrow pedestrian alleyway packed with storefront awnings, signboards, and compact multistory townhouses',
  },
  {
    id: 'brutalist',
    emoji: '🚝',
    label: 'Brutalist Monorail',
    prompt:
      'Monumental concrete cantilever structures straddling an elevated high-speed transit highway',
  },
  {
    id: 'gothic',
    emoji: '🏰',
    label: 'Gothic High Street',
    prompt:
      'Historic European cobblestone quarter with steep gabled roofs, decorative corbels, and stone-traceried window frames',
  },
  {
    id: 'amsterdam',
    emoji: '⛵',
    label: 'Amsterdam Waterfront',
    prompt:
      'Step-gabled narrow canal houses with waterfront quays, low bridges, and cobblestone quayside lanes',
  },
  {
    id: 'construction',
    emoji: '🏗️',
    label: 'Metropolis Skeletons',
    prompt:
      'Towering steel frame skyscraper skeletons with climbing crane jibs and industrial scaffolds',
  },
];

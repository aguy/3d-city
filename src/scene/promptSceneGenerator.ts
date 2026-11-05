import {
  BuildingStyle,
  GroundType,
  SceneArchetype,
  SceneDescriptor,
} from '../types/scenePromptTypes';

/**
 * Simple string hash function to generate a deterministic 32-bit integer seed.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Seeded pseudo-random number generator (Mulberry32).
 */
export function createRNG(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Checks if the Chrome Prompt API (Gemini Nano) is available in the current browser.
 */
export async function checkChromeAIAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.ai?.languageModel) {
      return false;
    }
    const factory = window.ai.languageModel;
    if (typeof factory.availability === 'function') {
      const status = await factory.availability();
      return status === 'readily' || status === 'after-download';
    }
    if (typeof factory.capabilities === 'function') {
      const caps = await factory.capabilities();
      return caps.available !== 'no';
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Heuristic Offline Semantic Synthesizer.
 * Analyzes the user's prompt tokens and scores archetypes, styles, scales, and props.
 */
export function synthesizeSceneFromPromptOffline(promptText: string): SceneDescriptor {
  const text = promptText.toLowerCase();

  // 0. Negation & Absence Detection
  const wantsNoBuildings =
    text.includes('no building') ||
    text.includes('no buildings') ||
    text.includes('without building') ||
    text.includes('without buildings') ||
    text.includes('zero building') ||
    text.includes('zero buildings') ||
    text.includes('blank street') ||
    text.includes('blank road') ||
    text.includes('blank scene') ||
    text.includes('empty street') ||
    text.includes('empty road') ||
    text.includes('open road') ||
    text.includes('open highway') ||
    text.includes('no houses') ||
    text.includes('no house') ||
    text.includes('no architecture') ||
    text.includes('no structures');

  const wantsSparseBuildings =
    !wantsNoBuildings &&
    (text.includes('sparse') ||
      text.includes('scattered') ||
      text.includes('few buildings') ||
      text.includes('suburban') ||
      text.includes('semi-rural'));

  const wantsNoVehicles =
    text.includes('no car') ||
    text.includes('no cars') ||
    text.includes('no vehicle') ||
    text.includes('no vehicles') ||
    text.includes('no traffic') ||
    text.includes('empty road') ||
    text.includes('empty street') ||
    text.includes('blank street') ||
    text.includes('blank road') ||
    text.includes('deserted') ||
    text.includes('abandoned') ||
    text.includes('pedestrian only');

  const wantsNoPedestrians =
    text.includes('no people') ||
    text.includes('no pedestrian') ||
    text.includes('no pedestrians') ||
    text.includes('empty street') ||
    text.includes('empty road') ||
    text.includes('blank street') ||
    text.includes('deserted') ||
    text.includes('abandoned') ||
    text.includes('ghost town');

  const wantsNoTrees =
    text.includes('no tree') ||
    text.includes('no trees') ||
    text.includes('treeless') ||
    text.includes('blank street') ||
    text.includes('blank road') ||
    text.includes('desert') ||
    text.includes('arid');

  const wantsNoLamps =
    text.includes('no lamp') ||
    text.includes('no lamps') ||
    text.includes('no pole') ||
    text.includes('no poles') ||
    text.includes('no street light') ||
    text.includes('blank street') ||
    text.includes('blank road');

  // 1. Archetype and ground detection
  let archetype: SceneArchetype = wantsNoBuildings ? 'open-road' : 'canyon';
  let groundType: GroundType = 'standard-road';
  let buildingStyle: BuildingStyle = 'modern-canyon';

  if (wantsNoBuildings) {
    archetype = 'open-road';
    groundType = 'standard-road';
    buildingStyle = 'modern-canyon';
  } else if (text.includes('canal') || text.includes('venice') || text.includes('water') || text.includes('river')) {
    archetype = 'canal';
    groundType = 'canal-water';
    buildingStyle = 'haussmann';
  } else if (text.includes('haussmann') || text.includes('paris') || text.includes('boulevard') || text.includes('avenue')) {
    archetype = 'boulevard';
    groundType = 'boulevard';
    buildingStyle = 'haussmann';
  } else if (text.includes('monorail') || text.includes('brutalist') || text.includes('highway') || text.includes('viaduct')) {
    archetype = 'monorail';
    groundType = 'monorail-highway';
    buildingStyle = 'brutalist';
  } else if (text.includes('tokyo') || text.includes('alley') || text.includes('shinjuku') || text.includes('back-alley') || text.includes('narrow')) {
    archetype = 'tokyo-alley';
    groundType = 'cobblestone-alley';
    buildingStyle = 'neo-tokyo';
  } else if (text.includes('cyberpunk') || text.includes('neo') || text.includes('blade') || text.includes('scifi') || text.includes('sci-fi')) {
    archetype = 'cyberpunk';
    groundType = 'standard-road';
    buildingStyle = 'sci-fi-spires';
  } else if (text.includes('gothic') || text.includes('cathedral') || text.includes('medieval') || text.includes('historic')) {
    archetype = 'gothic-historic';
    groundType = 'cobblestone-alley';
    buildingStyle = 'gothic-historic';
  } else if (text.includes('amsterdam') || text.includes('gable') || text.includes('quay')) {
    archetype = 'amsterdam';
    groundType = 'canal-water';
    buildingStyle = 'amsterdam-gabled';
  } else if (text.includes('construction') || text.includes('crane') || text.includes('scaffold') || text.includes('skeleton')) {
    archetype = 'construction';
    groundType = 'standard-road';
    buildingStyle = 'scaffold-frame';
  }

  // 2. Verticality and building heights
  let minH = 25;
  let maxH = 75;
  if (wantsNoBuildings) {
    minH = 0;
    maxH = 0;
  } else if (text.includes('skyscraper') || text.includes('tower') || text.includes('tall') || text.includes('metropolis') || archetype === 'cyberpunk' || archetype === 'canyon') {
    minH = 45;
    maxH = 110;
  } else if (text.includes('low') || text.includes('village') || text.includes('intimate') || archetype === 'tokyo-alley' || archetype === 'amsterdam') {
    minH = 14;
    maxH = 36;
  } else if (archetype === 'boulevard') {
    minH = 26;
    maxH = 48;
  }

  // 3. Street and sidewalk widths
  let streetWidth = 18;
  let sidewalkWidth = 4.5;
  if (archetype === 'open-road') {
    streetWidth = 20;
    sidewalkWidth = wantsNoBuildings ? 2.5 : 4.5;
  } else if (archetype === 'tokyo-alley') {
    streetWidth = 6.5;
    sidewalkWidth = 1.8;
  } else if (archetype === 'boulevard') {
    streetWidth = 26;
    sidewalkWidth = 7.5;
  } else if (archetype === 'canal') {
    streetWidth = 17;
    sidewalkWidth = 4;
  } else if (archetype === 'monorail') {
    streetWidth = 24;
    sidewalkWidth = 5;
  }

  // 4. Props & feature flags
  const hasBuildings = !wantsNoBuildings;
  const buildingDensity = wantsNoBuildings ? 0 : wantsSparseBuildings ? 0.35 : 1.0;
  const hasLandmarkTower = !wantsNoBuildings && !text.includes('no landmark') && !text.includes('no tower');
  const hasSkylineTowers = !wantsNoBuildings && !text.includes('no skyline') && !wantsSparseBuildings;

  const hasCanalBridges = !wantsNoBuildings && (archetype === 'canal' || archetype === 'amsterdam');
  const hasSkybridges = !wantsNoBuildings && (archetype === 'cyberpunk' || text.includes('skybridge') || text.includes('bridge'));
  const hasMonorailTrack = !wantsNoBuildings && (archetype === 'monorail' || text.includes('monorail') || text.includes('train'));
  const hasTrees = !wantsNoTrees && (archetype === 'boulevard' || archetype === 'amsterdam' || text.includes('tree'));
  const hasStreetAwnings = !wantsNoBuildings && (archetype === 'tokyo-alley' || buildingStyle === 'haussmann' || text.includes('awning'));
  const hasAntennaSpires = !wantsNoBuildings && (archetype === 'cyberpunk' || archetype === 'canyon' || text.includes('antenna'));
  const hasCranes = !wantsNoBuildings && (archetype === 'construction' || text.includes('crane'));

  // 5. Aesthetic Paper Theme and Stylings
  let paperTheme: 'cream' | 'blueprint' | 'terminal' | 'vellum' = 'cream';
  let hatchDensity = 15;
  let stippleShade = 0;
  let lineWeight = 1.2;
  let lineJitter = 4;
  let cornerOvershoot = 25;

  if (archetype === 'cyberpunk') {
    paperTheme = 'terminal';
    lineWeight = 1.4;
    lineJitter = 2;
    hatchDensity = 30;
    stippleShade = 20;
    cornerOvershoot = 40;
  } else if (archetype === 'monorail' || archetype === 'construction') {
    paperTheme = 'blueprint';
    lineWeight = 1.1;
    cornerOvershoot = 50;
    hatchDensity = 45;
  } else if (archetype === 'gothic-historic' || archetype === 'amsterdam') {
    paperTheme = 'vellum';
    lineWeight = 1.0;
    lineJitter = 12;
    cornerOvershoot = 35;
    hatchDensity = 35;
  } else if (archetype === 'boulevard') {
    paperTheme = 'cream';
    lineWeight = 1.2;
    lineJitter = 3;
    cornerOvershoot = 20;
  }

  // 6. Recommended Camera framing
  let camHeight = 35;
  let camAlong = 12;
  let camSide = -45;
  let pitch = 14;
  let turn = 12;
  let fov = 42;
  let lookAhead = 85;

  if (archetype === 'open-road') {
    camHeight = 4.2;
    camAlong = 14;
    camSide = -12;
    pitch = 5;
    turn = 0;
    fov = 52;
    lookAhead = 150;
  } else if (archetype === 'tokyo-alley') {
    camHeight = 2.4; // Eye-level pedestrian in narrow alley
    camAlong = 18;
    camSide = -10;
    pitch = 6;
    turn = 2;
    fov = 58;
    lookAhead = 40;
  } else if (archetype === 'boulevard') {
    camHeight = 16;
    camAlong = 8;
    camSide = -60;
    pitch = 10;
    turn = 16;
    fov = 48;
    lookAhead = 110;
  } else if (archetype === 'canal') {
    camHeight = 7.5;
    camAlong = 15;
    camSide = -35;
    pitch = 8;
    turn = 10;
    fov = 50;
    lookAhead = 75;
  } else if (archetype === 'cyberpunk' || archetype === 'construction') {
    camHeight = 65;
    camAlong = 6;
    camSide = -75;
    pitch = 18;
    turn = 14;
    fov = 36;
    lookAhead = 100;
  }

  return {
    archetype,
    name: promptText ? promptText.slice(0, 40) : 'Procedural City Canyon',
    description: wantsNoBuildings
      ? `Generated open ${archetype} wireframe with no buildings (${groundType}).`
      : `Generated ${archetype} wireframe environment (${buildingStyle} architecture, ${groundType}).`,
    groundType,
    buildingStyle,
    hasBuildings,
    buildingDensity,
    hasLandmarkTower,
    hasSkylineTowers,
    buildingHeights: {
      min: minH,
      max: maxH,
      variance: (maxH - minH) * 0.4,
    },
    streetWidth,
    sidewalkWidth,
    hasCanalBridges,
    hasSkybridges,
    hasMonorailTrack,
    hasTrees,
    hasStreetAwnings,
    hasAntennaSpires,
    hasCranes,
    propDensity: {
      trees: wantsNoTrees ? 0 : hasTrees ? 0.8 : 0.1,
      lamps: wantsNoLamps ? 0 : 0.7,
      vehicles: wantsNoVehicles ? 0 : archetype === 'canal' || archetype === 'tokyo-alley' ? 0.1 : 0.7,
      pedestrians: wantsNoPedestrians ? 0 : 0.8,
      overheads: wantsNoBuildings ? 0 : hasSkybridges || hasMonorailTrack || hasCanalBridges ? 0.8 : 0.2,
    },
    recommendedStyle: {
      paperTheme,
      renderMode: 'edges-occluded',
      lineWeight,
      lineJitter,
      hatchDensity,
      stippleShade,
      cornerOvershoot,
      windowDensity: wantsNoBuildings ? 0 : 80,
      balconyDensity: wantsNoBuildings ? 0 : buildingStyle === 'haussmann' ? 85 : 55,
      buildingDetail: wantsNoBuildings ? 0 : 80,
    },
    recommendedCamera: {
      cameraHeight: camHeight,
      pitch,
      turn,
      fov,
      lookAhead,
      cameraAlong: camAlong,
      cameraSide: camSide,
    },
  };
}

/**
 * Generates a SceneDescriptor from user prompt using Chrome Prompt API (Gemini Nano) if available,
 * falling back to the offline semantic synthesizer.
 */
export async function generateSceneFromPrompt(promptText: string): Promise<{
  descriptor: SceneDescriptor;
  source: 'chrome-ai' | 'offline-heuristic';
}> {
  const isAvailable = await checkChromeAIAvailable();

  if (isAvailable && window.ai?.languageModel) {
    try {
      const session = await window.ai.languageModel.create({
        systemPrompt: `You are an architectural 3D urban scene generator. Given a user description, output a JSON object matching this schema:
{
  "archetype": "canyon" | "boulevard" | "canal" | "monorail" | "tokyo-alley" | "brutalist" | "gothic-historic" | "cyberpunk" | "amsterdam" | "construction" | "open-road" | "minimalist",
  "name": "short scene title",
  "description": "brief description",
  "groundType": "standard-road" | "canal-water" | "boulevard" | "cobblestone-alley" | "monorail-highway",
  "buildingStyle": "modern-canyon" | "haussmann" | "brutalist" | "neo-tokyo" | "sci-fi-spires" | "gothic-historic" | "amsterdam-gabled" | "scaffold-frame",
  "hasBuildings": boolean,
  "buildingDensity": number (0.0 to 1.0),
  "hasLandmarkTower": boolean,
  "hasSkylineTowers": boolean,
  "buildingHeights": { "min": number, "max": number, "variance": number },
  "streetWidth": number (6 to 30),
  "sidewalkWidth": number (1.5 to 8),
  "hasCanalBridges": boolean,
  "hasSkybridges": boolean,
  "hasMonorailTrack": boolean,
  "hasTrees": boolean,
  "hasStreetAwnings": boolean,
  "hasAntennaSpires": boolean,
  "hasCranes": boolean,
  "propDensity": {
    "trees": number (0 to 1),
    "lamps": number (0 to 1),
    "vehicles": number (0 to 1),
    "pedestrians": number (0 to 1),
    "overheads": number (0 to 1)
  },
  "recommendedStyle": {
    "paperTheme": "cream" | "blueprint" | "terminal" | "vellum",
    "renderMode": "edges-occluded",
    "lineWeight": number (0.6 to 2.5),
    "lineJitter": number (0 to 20),
    "hatchDensity": number (0 to 60),
    "stippleShade": number (0 to 50),
    "cornerOvershoot": number (0 to 80),
    "windowDensity": number (0 to 100),
    "balconyDensity": number (0 to 100),
    "buildingDetail": number (0 to 100)
  },
  "recommendedCamera": {
    "cameraHeight": number (2 to 80),
    "pitch": number (-30 to 45),
    "turn": number (-45 to 45),
    "fov": number (25 to 75),
    "lookAhead": number (20 to 160),
    "cameraAlong": number (0 to 50),
    "cameraSide": number (-80 to 80)
  }
}
CRITICAL INSTRUCTIONS:
- If the user specifies "no buildings", "without buildings", "blank street", "empty road", or requests an empty open scene, you MUST set hasBuildings to false, buildingDensity to 0, hasLandmarkTower to false, hasSkylineTowers to false, and min/max heights to 0.
- If the user specifies "no cars", "no traffic", or "empty", set vehicles to 0 in propDensity.
- Output ONLY valid JSON, with no markdown code fence or extra text.`,
      });

      const rawResponse = await session.prompt(promptText);
      session.destroy?.();

      const cleaned = rawResponse
        .replace(/^```json/i, '')
        .replace(/^```/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned) as Partial<SceneDescriptor>;
      const fallback = synthesizeSceneFromPromptOffline(promptText);

      // Merge parsed with safe fallback defaults
      const descriptor: SceneDescriptor = {
        ...fallback,
        ...parsed,
        hasBuildings: typeof parsed.hasBuildings === 'boolean' ? parsed.hasBuildings : fallback.hasBuildings,
        buildingDensity: typeof parsed.buildingDensity === 'number' ? parsed.buildingDensity : fallback.buildingDensity,
        hasLandmarkTower: typeof parsed.hasLandmarkTower === 'boolean' ? parsed.hasLandmarkTower : fallback.hasLandmarkTower,
        hasSkylineTowers: typeof parsed.hasSkylineTowers === 'boolean' ? parsed.hasSkylineTowers : fallback.hasSkylineTowers,
        hasTrees: typeof parsed.hasTrees === 'boolean' ? parsed.hasTrees : fallback.hasTrees,
        hasSkybridges: typeof parsed.hasSkybridges === 'boolean' ? parsed.hasSkybridges : fallback.hasSkybridges,
        buildingHeights: {
          ...fallback.buildingHeights,
          ...(parsed.buildingHeights || {}),
        },
        propDensity: {
          ...fallback.propDensity,
          ...(parsed.propDensity || {}),
        },
        recommendedStyle: {
          ...fallback.recommendedStyle,
          ...(parsed.recommendedStyle || {}),
        },
        recommendedCamera: {
          ...fallback.recommendedCamera,
          ...(parsed.recommendedCamera || {}),
        },
      };

      return { descriptor, source: 'chrome-ai' };
    } catch (err) {
      console.warn('Chrome Prompt API generation failed, falling back to offline synthesizer:', err);
    }
  }

  return {
    descriptor: synthesizeSceneFromPromptOffline(promptText),
    source: 'offline-heuristic',
  };
}

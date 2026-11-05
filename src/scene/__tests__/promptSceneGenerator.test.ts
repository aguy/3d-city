import { describe, expect, it } from 'vitest';
import {
  generateSceneFromPrompt,
  hashString,
  synthesizeSceneFromPromptOffline,
} from '../promptSceneGenerator';
import { PROMPT_SUGGESTIONS } from '../../types/scenePromptTypes';
import { buildRoadScene } from '../roadBuilder';
import { buildBuildingsScene } from '../buildingBuilder';
import { buildVehiclesScene } from '../vehicleBuilder';
import { buildPedestriansScene } from '../pedestrianBuilder';

describe('Prompt Scene Generator & Synthesizer', () => {
  it('hashes strings deterministically', () => {
    const h1 = hashString('Venetian Canal');
    const h2 = hashString('Venetian Canal');
    const h3 = hashString('Haussmann Boulevard');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('correctly maps keywords to canal archetype and ground geometry', () => {
    const desc = synthesizeSceneFromPromptOffline(
      'Picturesque water canal with stone bridges'
    );
    expect(desc.archetype).toBe('canal');
    expect(desc.groundType).toBe('canal-water');
    expect(desc.hasCanalBridges).toBe(true);

    const road = buildRoadScene(desc);
    const buildings = buildBuildingsScene(desc);
    expect(road.children.length).toBeGreaterThan(0);
    expect(buildings.children.length).toBeGreaterThan(0);
  });

  it('correctly maps Haussmannian boulevard keywords to mansard roofs and wide avenues', () => {
    const desc = synthesizeSceneFromPromptOffline(
      'Tree-lined Parisian avenue with grand mansard roofs'
    );
    expect(desc.archetype).toBe('boulevard');
    expect(desc.groundType).toBe('boulevard');
    expect(desc.buildingStyle).toBe('haussmann');
    expect(desc.streetWidth).toBeGreaterThan(20);
    expect(desc.hasTrees).toBe(true);
  });

  it('correctly maps cyberpunk keywords to skybridges and sci-fi spires', () => {
    const desc = synthesizeSceneFromPromptOffline(
      'Cyberpunk vertical metropolis with skybridges'
    );
    expect(desc.archetype).toBe('cyberpunk');
    expect(desc.buildingStyle).toBe('sci-fi-spires');
    expect(desc.hasSkybridges).toBe(true);
    expect(desc.recommendedStyle.paperTheme).toBe('terminal');
  });

  it('correctly maps brutalist monorail keywords to elevated track highway', () => {
    const desc = synthesizeSceneFromPromptOffline(
      'Brutalist concrete cantilevers over monorail highway'
    );
    expect(desc.archetype).toBe('monorail');
    expect(desc.groundType).toBe('monorail-highway');
    expect(desc.hasMonorailTrack).toBe(true);
    expect(desc.recommendedStyle.paperTheme).toBe('blueprint');
  });

  it('correctly parses negative prompts like "blank street with no buildings"', () => {
    const desc = synthesizeSceneFromPromptOffline('blank street with no buildings');
    expect(desc.hasBuildings).toBe(false);
    expect(desc.buildingDensity).toBe(0);
    expect(desc.archetype).toBe('open-road');
    expect(desc.buildingHeights.min).toBe(0);
    expect(desc.buildingHeights.max).toBe(0);
    expect(desc.hasLandmarkTower).toBe(false);
    expect(desc.hasSkylineTowers).toBe(false);
    expect(desc.propDensity.vehicles).toBe(0);
    expect(desc.propDensity.pedestrians).toBe(0);

    // Verify Three.js scene outputs
    const buildings = buildBuildingsScene(desc);
    expect(buildings.children.length).toBe(0); // Absolutely no buildings generated!

    const road = buildRoadScene(desc);
    expect(road.children.length).toBeGreaterThan(0); // Road is still rendered

    const vehicles = buildVehiclesScene(desc.propDensity.vehicles);
    expect(vehicles.group.children.length).toBe(0); // No vehicles on blank street

    const pedestrians = buildPedestriansScene(desc.propDensity.pedestrians);
    expect(pedestrians.group.children.length).toBe(0); // No pedestrians on blank street
  });

  it('generates scene specs for all preset prompt suggestions without errors', async () => {
    for (const s of PROMPT_SUGGESTIONS) {
      const { descriptor, source } = await generateSceneFromPrompt(s.prompt);
      expect(descriptor).toBeDefined();
      expect(descriptor.archetype).toBeDefined();
      expect(descriptor.recommendedCamera).toBeDefined();
      expect(descriptor.recommendedStyle).toBeDefined();
      expect(['chrome-ai', 'offline-heuristic']).toContain(source);
    }

    // Verify building full 3D geometry for a sample generated descriptor
    const sample = PROMPT_SUGGESTIONS[0];
    const { descriptor } = await generateSceneFromPrompt(sample.prompt);
    const road = buildRoadScene(descriptor);
    const buildings = buildBuildingsScene(descriptor);
    expect(road.children.length).toBeGreaterThan(0);
    expect(buildings.children.length).toBeGreaterThan(0);
  });
});

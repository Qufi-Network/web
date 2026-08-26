'use client';

import { AdaptiveQuality } from '../../experience/systems/AdaptiveQuality';
import { CameraDirector } from '../../experience/systems/CameraDirector';
import { ConnectionSystem } from '../../experience/systems/ConnectionSystem';
import { InteractionSystem } from '../../experience/systems/InteractionSystem';
import { NetworkDriver } from '../../experience/systems/NetworkDriver';
import { NodeSystem } from '../../experience/systems/NodeSystem';
import { ParticleField } from '../../experience/systems/ParticleField';
import { QuFiCore } from '../../experience/systems/QuFiCore';
import { SpaceDirector } from '../../experience/systems/SpaceDirector';
import { Spines } from '../../experience/systems/Spines';
import { Structures } from '../../experience/systems/Structures';
import { SubstrateLayer } from '../../experience/systems/SubstrateLayer';

/**
 * Scene composition.
 *
 * Mount order is load-bearing: frame callbacks run in the order they subscribe.
 * The driver advances the simulation before anything reads it, the director
 * decides where the visitor is before the camera is placed, and the structure
 * field writes the per-space state texture before the pathways sample it.
 * Everything below the camera only reads; nothing else writes.
 */
export function Scene() {
  return (
    <>
      <NetworkDriver />
      <SpaceDirector />
      <InteractionSystem />
      <CameraDirector />
      <AdaptiveQuality />

      <ParticleField />
      <SubstrateLayer />
      <Structures />
      <Spines />
      <ConnectionSystem />
      <NodeSystem />
      <QuFiCore />
    </>
  );
}

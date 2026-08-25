'use client';

import { AdaptiveQuality } from '../../experience/systems/AdaptiveQuality';
import { CameraDirector } from '../../experience/systems/CameraDirector';
import { ConnectionSystem } from '../../experience/systems/ConnectionSystem';
import { InteractionSystem } from '../../experience/systems/InteractionSystem';
import { NetworkDriver } from '../../experience/systems/NetworkDriver';
import { NodeSystem } from '../../experience/systems/NodeSystem';
import { ParticleField } from '../../experience/systems/ParticleField';
import { QuFiCore } from '../../experience/systems/QuFiCore';
import { ScrollDirector } from '../../experience/systems/ScrollDirector';
import { SubstrateLayer } from '../../experience/systems/SubstrateLayer';
import { NodeLabelProjector } from '../../experience/systems/NodeLabelProjector';
import { FeatureProjector } from '../../experience/systems/FeatureProjector';
import { MarkBurst } from '../../experience/systems/MarkBurst';
import { NodeBurst } from '../../experience/systems/NodeBurst';
import { YourNode } from '../../experience/systems/YourNode';
import { DistrictSystem } from '../../experience/systems/DistrictSystem';
import { AssetJourney } from '../../experience/systems/AssetJourney';
import { ValueFlow } from '../../experience/systems/ValueFlow';

/**
 * Scene composition.
 *
 * Mount order is load-bearing: frame callbacks run in the order they subscribe,
 * so the driver advances the simulation and uploads its buffers before any
 * system reads them, and the camera is placed before anything is drawn through
 * it. Everything below the interaction system only reads state; nothing else
 * writes.
 */
export function Scene({ scrolling }: { scrolling: boolean }) {
  return (
    <>
      <NetworkDriver />
      <ScrollDirector active={scrolling} />
      <InteractionSystem />
      <CameraDirector />
      <AdaptiveQuality />

      <ParticleField />
      <SubstrateLayer />
      <DistrictSystem />
      <ConnectionSystem />
      <NodeSystem />
      <QuFiCore />
      <AssetJourney />
      <ValueFlow />
      <YourNode />
      <NodeLabelProjector />
      <FeatureProjector />
      <MarkBurst />
      <NodeBurst />
    </>
  );
}

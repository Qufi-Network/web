'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DataTexture, FloatType, NearestFilter, RGBAFormat } from 'three';
import { NetworkEngine } from '../network/NetworkEngine';
import type { Capability } from '../lib/capability';

interface NetworkResources {
  engine: NetworkEngine;
  /** x, y, z, seed per node. Written once. Read by the connection shader. */
  nodeStaticTexture: DataTexture;
  /** activity, focus, pulse, status per node. Rewritten every frame. */
  nodeStateTexture: DataTexture;
  /** signalHead, intensity, traffic, kind per edge. Rewritten every frame. */
  edgeStateTexture: DataTexture;
  capability: Capability;
}

const NetworkContext = createContext<NetworkResources | null>(null);

function dataTexture(data: Float32Array, size: number): DataTexture {
  const texture = new DataTexture(data, size, size, RGBAFormat, FloatType);
  // Nothing is interpolated between records — a texel is a node, not a sample —
  // so nearest filtering is both correct and avoids needing the linear-filter
  // extension for float textures.
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function NetworkProvider({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const value = useMemo<NetworkResources>(() => {
    const engine = new NetworkEngine({
      nodeCount: capability.nodeCount,
      maxSignals: capability.maxSignals,
    });
    return {
      engine,
      capability,
      nodeStaticTexture: dataTexture(engine.nodeStatic, engine.nodeTexSize),
      nodeStateTexture: dataTexture(engine.nodeState, engine.nodeTexSize),
      edgeStateTexture: dataTexture(engine.edgeState, engine.edgeTexSize),
    };
  }, [capability]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkResources {
  const value = useContext(NetworkContext);
  if (!value) throw new Error('useNetwork must be used inside a NetworkProvider');
  return value;
}

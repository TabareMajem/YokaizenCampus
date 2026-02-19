import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import React from 'react';
import * as THREE from 'three';

interface CyberpunkEffectsProps {
    bloomIntensity?: number;
    bloomLuminanceThreshold?: number;
    glitchFactor?: number;
    noiseOpacity?: number;
}

export const CyberpunkEffects: React.FC<CyberpunkEffectsProps> = ({
    bloomIntensity = 1.5,
    bloomLuminanceThreshold = 0.2,
    glitchFactor = 0.002,
    noiseOpacity = 0.15,
}) => {
    return (
        <EffectComposer>
            <Bloom
                luminanceThreshold={bloomLuminanceThreshold}
                mipmapBlur
                intensity={bloomIntensity}
            />
            <ChromaticAberration
                offset={new THREE.Vector2(glitchFactor, glitchFactor)}
                blendFunction={BlendFunction.NORMAL}
            />
            <Noise opacity={noiseOpacity} blendFunction={BlendFunction.OVERLAY} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
    );
};

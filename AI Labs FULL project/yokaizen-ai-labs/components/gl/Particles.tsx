import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticlesProps {
    count?: number;
    color?: string;
    speed?: number;
    size?: number;
}

export const Particles: React.FC<ParticlesProps> = ({
    count = 1000,
    color = '#00ffff',
    speed = 0.5,
    size = 0.05
}) => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Generate random positions
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 20;
            const y = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            const velocity = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed);
            temp.push({ x, y, z, velocity });
        }
        return temp;
    }, [count, speed]);

    useFrame((state, delta) => {
        if (!mesh.current) return;

        particles.forEach((particle, i) => {
            particle.y += particle.velocity.y * delta;
            particle.x += particle.velocity.x * delta;
            particle.z += particle.velocity.z * delta;

            // Reset if out of bounds
            if (particle.y > 10) particle.y = -10;
            if (particle.x > 10 || particle.x < -10) particle.x *= -1;
            if (particle.z > 10 || particle.z < -10) particle.z *= -1;

            dummy.position.set(particle.x, particle.y, particle.z);
            dummy.updateMatrix();
            mesh.current.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <sphereGeometry args={[size, 4, 4]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
        </instancedMesh>
    );
};

import * as THREE from 'three';
import { ReactThreeFiber } from '@react-three/fiber';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            mesh: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
            group: ReactThreeFiber.Object3DNode<THREE.Group, typeof THREE.Group>;
            color: ReactThreeFiber.Object3DNode<THREE.Color, typeof THREE.Color>;
            fog: ReactThreeFiber.Object3DNode<THREE.Fog, typeof THREE.Fog>;
            ambientLight: ReactThreeFiber.Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
            pointLight: ReactThreeFiber.Object3DNode<THREE.PointLight, typeof THREE.PointLight>;
            directionalLight: ReactThreeFiber.Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>;
            spotLight: ReactThreeFiber.Object3DNode<THREE.SpotLight, typeof THREE.SpotLight>;
            icosahedronGeometry: ReactThreeFiber.Object3DNode<THREE.IcosahedronGeometry, typeof THREE.IcosahedronGeometry>;
            dodecahedronGeometry: ReactThreeFiber.Object3DNode<THREE.DodecahedronGeometry, typeof THREE.DodecahedronGeometry>;
            octahedronGeometry: ReactThreeFiber.Object3DNode<THREE.OctahedronGeometry, typeof THREE.OctahedronGeometry>;
            tetrahedronGeometry: ReactThreeFiber.Object3DNode<THREE.TetrahedronGeometry, typeof THREE.TetrahedronGeometry>;
            boxGeometry: ReactThreeFiber.Object3DNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>;
            sphereGeometry: ReactThreeFiber.Object3DNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>;
            cylinderGeometry: ReactThreeFiber.Object3DNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>;
            coneGeometry: ReactThreeFiber.Object3DNode<THREE.ConeGeometry, typeof THREE.ConeGeometry>;
            torusGeometry: ReactThreeFiber.Object3DNode<THREE.TorusGeometry, typeof THREE.TorusGeometry>;
            torusKnotGeometry: ReactThreeFiber.Object3DNode<THREE.TorusKnotGeometry, typeof THREE.TorusKnotGeometry>;
            ringGeometry: ReactThreeFiber.Object3DNode<THREE.RingGeometry, typeof THREE.RingGeometry>;
            meshBasicMaterial: ReactThreeFiber.Object3DNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>;
            meshStandardMaterial: ReactThreeFiber.Object3DNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>;
            meshPhysicalMaterial: ReactThreeFiber.Object3DNode<THREE.MeshPhysicalMaterial, typeof THREE.MeshPhysicalMaterial>;
            lineBasicMaterial: ReactThreeFiber.Object3DNode<THREE.LineBasicMaterial, typeof THREE.LineBasicMaterial>;
            gridHelper: ReactThreeFiber.Object3DNode<THREE.GridHelper, typeof THREE.GridHelper>;
            instancedMesh: ReactThreeFiber.Object3DNode<THREE.InstancedMesh, typeof THREE.InstancedMesh>;
        }
    }
}

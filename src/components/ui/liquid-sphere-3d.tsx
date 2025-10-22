import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, OrbitControls } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

interface LiquidSphere3DProps {
  value: number; // 0-100
  className?: string;
}

const LiquidSphereInner = ({ value }: { value: number }) => {
  const sphereRef = useRef<THREE.Group>(null);
  const liquidRef = useRef<THREE.Mesh>(null);
  
  // Smooth rotation animation
  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });
  
  // Calculate liquid fill level (0 to 1)
  const fillLevel = value / 100;
  
  // Create clipping plane for liquid effect
  const clipPlane = useMemo(() => {
    const height = -1 + (fillLevel * 2); // -1 to 1 range
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -height);
  }, [fillLevel]);
  
  return (
    <group ref={sphereRef}>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color="#a78bfa" />
      <pointLight position={[0, 2, 3]} intensity={0.8} color="#6366f1" />
      
      {/* Glass Sphere Container */}
      <Sphere args={[1.5, 64, 64]}>
        <meshPhysicalMaterial
          color="#f0f9ff"
          metalness={0.1}
          roughness={0.05}
          transmission={0.98}
          thickness={0.5}
          transparent
          opacity={0.3}
        />
      </Sphere>
      
      {/* Liquid Inside - with clipping */}
      <Sphere 
        ref={liquidRef}
        args={[1.45, 64, 64]}
      >
        <meshStandardMaterial
          color="#6366f1"
          emissive="#8b5cf6"
          emissiveIntensity={0.4}
          metalness={0.3}
          roughness={0.4}
          clippingPlanes={[clipPlane]}
          clipShadows
        />
      </Sphere>
      
      {/* Inner glow effect */}
      <Sphere args={[1.4, 32, 32]}>
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={fillLevel * 0.15}
          clippingPlanes={[clipPlane]}
        />
      </Sphere>
      
      {/* Drip particles when low */}
      {fillLevel < 0.3 && (
        <>
          <Sphere args={[0.06, 16, 16]} position={[0, -1.6, 0]}>
            <meshStandardMaterial
              color="#6366f1"
              emissive="#8b5cf6"
              emissiveIntensity={1}
            />
          </Sphere>
          <Sphere args={[0.04, 16, 16]} position={[0.15, -1.75, 0]}>
            <meshStandardMaterial
              color="#6366f1"
              emissive="#a78bfa"
              emissiveIntensity={0.8}
            />
          </Sphere>
        </>
      )}
    </group>
  );
};

export const LiquidSphere3D = ({ value, className }: LiquidSphere3DProps) => {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: "transparent" }}
        gl={{ 
          localClippingEnabled: true,
          alpha: true,
          antialias: true 
        }}
      >
        <LiquidSphereInner value={value} />
      </Canvas>
    </div>
  );
};

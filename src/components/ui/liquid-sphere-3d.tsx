import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Environment } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

interface LiquidSphere3DProps {
  value: number; // 0-100
  className?: string;
}

const LiquidContent = ({ value }: { value: number }) => {
  const liquidRef = useRef<THREE.Mesh>(null);
  
  // Calculate liquid scale based on value (0-100)
  const liquidScale = Math.max(0.3, value / 100);
  const liquidY = -0.5 + (liquidScale * 0.5); // Move liquid down as it decreases
  
  return (
    <>
      {/* Ambient Light */}
      <ambientLight intensity={0.5} />
      
      {/* Main Light */}
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      
      {/* Point Light for glow effect */}
      <pointLight position={[0, 0, 2]} intensity={0.8} color="#3b82f6" />
      
      {/* Environment for reflections */}
      <Environment preset="city" />
      
      {/* Outer Glass Sphere */}
      <Sphere args={[1.2, 64, 64]} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          metalness={0.1}
          roughness={0.1}
          transmission={0.95}
          thickness={0.5}
          envMapIntensity={1}
        />
      </Sphere>
      
      {/* Inner Liquid Sphere */}
      <Sphere 
        ref={liquidRef}
        args={[1, 64, 64]} 
        position={[0, liquidY, 0]} 
        scale={[liquidScale, liquidScale, liquidScale]}
      >
        <MeshDistortMaterial
          color="#3b82f6"
          emissive="#7c3aed"
          emissiveIntensity={0.3}
          metalness={0.2}
          roughness={0.2}
          distort={0.3}
          speed={2}
          transparent
          opacity={0.85}
        />
      </Sphere>
      
      {/* Drip effect when liquid is low */}
      {value < 30 && (
        <>
          <Sphere args={[0.08, 16, 16]} position={[0, -1.3, 0]}>
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#7c3aed"
              emissiveIntensity={0.5}
              metalness={0.3}
              transparent
              opacity={0.8}
            />
          </Sphere>
          <Sphere args={[0.05, 16, 16]} position={[0.15, -1.5, 0.1]}>
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#7c3aed"
              emissiveIntensity={0.5}
              metalness={0.3}
              transparent
              opacity={0.6}
            />
          </Sphere>
        </>
      )}
      
      {/* Crack/Leak effect at bottom */}
      {value < 50 && (
        <mesh position={[0, -1.2, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.05, 0.3, 8]} />
          <meshStandardMaterial
            color="#1e40af"
            emissive="#3b82f6"
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </>
  );
};

export const LiquidSphere3D = ({ value, className }: LiquidSphere3DProps) => {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <LiquidContent value={value} />
      </Canvas>
    </div>
  );
};

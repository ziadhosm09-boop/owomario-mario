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
  
  // Calculate liquid height (0-100)
  const fillPercentage = value / 100;
  const liquidHeight = fillPercentage * 2; // Total height range
  const liquidY = -1 + liquidHeight; // Start from bottom (-1) and rise up
  
  return (
    <>
      {/* Ambient Light */}
      <ambientLight intensity={0.8} />
      
      {/* Main Lights */}
      <directionalLight position={[3, 3, 3]} intensity={1.5} />
      <directionalLight position={[-3, -3, -3]} intensity={0.5} />
      
      {/* Colored Point Lights for glow */}
      <pointLight position={[0, 1, 2]} intensity={1.5} color="#4f46e5" />
      <pointLight position={[0, -1, 2]} intensity={1} color="#7c3aed" />
      
      {/* Outer Glass Sphere - more visible */}
      <Sphere args={[1.2, 64, 64]} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          color="#e0e7ff"
          transparent
          opacity={0.25}
          metalness={0.05}
          roughness={0.05}
          transmission={0.9}
          thickness={0.3}
          envMapIntensity={0.5}
        />
      </Sphere>
      
      {/* Inner Liquid - much more visible */}
      <Sphere 
        ref={liquidRef}
        args={[1, 64, 64]} 
        position={[0, liquidY, 0]} 
        scale={[1, fillPercentage * 1.2, 1]}
      >
        <MeshDistortMaterial
          color="#6366f1"
          emissive="#8b5cf6"
          emissiveIntensity={0.8}
          metalness={0.4}
          roughness={0.3}
          distort={0.4}
          speed={2}
          transparent={false}
          opacity={1}
        />
      </Sphere>
      
      {/* Additional glow layer */}
      <Sphere 
        args={[1.05, 32, 32]} 
        position={[0, liquidY, 0]} 
        scale={[1, fillPercentage * 1.2, 1]}
      >
        <meshStandardMaterial
          color="#818cf8"
          emissive="#a78bfa"
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
        />
      </Sphere>
      
      {/* Drip effects when liquid is low */}
      {value < 40 && (
        <>
          <Sphere args={[0.12, 16, 16]} position={[0, -1.35, 0]}>
            <meshStandardMaterial
              color="#6366f1"
              emissive="#8b5cf6"
              emissiveIntensity={1}
              metalness={0.5}
            />
          </Sphere>
          {value < 25 && (
            <>
              <Sphere args={[0.08, 16, 16]} position={[0.2, -1.5, 0.1]}>
                <meshStandardMaterial
                  color="#6366f1"
                  emissive="#8b5cf6"
                  emissiveIntensity={1}
                  metalness={0.5}
                />
              </Sphere>
              <Sphere args={[0.06, 16, 16]} position={[-0.15, -1.6, -0.1]}>
                <meshStandardMaterial
                  color="#6366f1"
                  emissive="#8b5cf6"
                  emissiveIntensity={0.8}
                  metalness={0.5}
                />
              </Sphere>
            </>
          )}
        </>
      )}
      
      {/* Crack stream when leaking */}
      {value < 60 && (
        <mesh position={[0, -1.2 + (liquidY * 0.5), 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.06, Math.max(0.2, liquidY + 1.2), 8]} />
          <meshStandardMaterial
            color="#4f46e5"
            emissive="#7c3aed"
            emissiveIntensity={1.2}
            transparent
            opacity={0.8}
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

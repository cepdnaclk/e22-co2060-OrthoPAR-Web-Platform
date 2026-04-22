import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Text } from '@react-three/drei';

function JawModel({ showUpper, showLower, highlightLandmarks, onAddLandmark }) {
  // A placeholder representing an upper and lower jaw (arch shape using partial Torus)
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}> {/* Rotate to lay flat */}
      {showUpper && (
        <mesh 
            position={[0, 0, 0.5]} 
            onClick={onAddLandmark}
            castShadow 
            receiveShadow
        >
          <torusGeometry args={[3, 0.8, 16, 100, Math.PI]} />
          <meshStandardMaterial color="#E8F4FD" roughness={0.4} />
        </mesh>
      )}
      {showLower && (
        <mesh 
            position={[0, 0, -0.5]} 
            rotation={[0, 0, Math.PI]} 
            onClick={onAddLandmark}
            castShadow 
            receiveShadow
        >
          <torusGeometry args={[2.8, 0.8, 16, 100, Math.PI]} />
          <meshStandardMaterial color="#F0F9FF" roughness={0.4} />
        </mesh>
      )}
      
      {/* Predefined visual markers when highlightLandmarks is active */}
      {highlightLandmarks && showUpper && (
        <group>
          <LandmarkLabel position={[0, 3.8, 0.5]} text="OB" />
          <LandmarkLabel position={[-3, 0, 0.5]} text="ML" />
          <LandmarkLabel position={[3, 0, 0.5]} text="OJ" />
        </group>
      )}
    </group>
  );
}

function LandmarkLabel({ position, text }) {
  return (
    <group position={position}>
      <Sphere args={[0.2, 16, 16]}>
        <meshBasicMaterial color="#0077B6" />
      </Sphere>
      <Text
        position={[0, 0, 0.6]}
        rotation={[Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="#0077B6"
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  );
}

export default function ThreeViewer({ showUpper, showLower, highlightLandmarks }) {
  const [landmarks, setLandmarks] = useState([]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    const { point } = e;
    setLandmarks(prev => [...prev, point]);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas camera={{ position: [0, 8, 8], fov: 45 }} shadows>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <directionalLight position={[-10, 10, -5]} intensity={0.5} />
            
            <JawModel 
                showUpper={showUpper} 
                showLower={showLower} 
                highlightLandmarks={highlightLandmarks}
                onAddLandmark={handlePointerDown} 
            />

            {/* Render manually added landmarks */}
            {landmarks.map((pos, idx) => (
                <Sphere key={idx} position={pos} args={[0.15, 16, 16]}>
                    <meshStandardMaterial color="#EF4444" roughness={0.2} metalness={0.1} />
                </Sphere>
            ))}

            <OrbitControls 
                enableDamping 
                dampingFactor={0.05} 
                maxDistance={20}
                minDistance={2}
            />
        </Canvas>
        
        {landmarks.length > 0 && (
            <button 
                onClick={() => setLandmarks([])}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#334155',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
            >
                Clear Landmarks ({landmarks.length})
            </button>
        )}
    </div>
  );
}

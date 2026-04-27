import React, { useState, Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Text, Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Renders an actual STL mesh dynamically fetched securely from the backend
function STLMesh({ url, position, color, onAddLandmark }) {
  const geometry = useLoader(STLLoader, url, (loader) => {
    const token = localStorage.getItem("orthopar_token");
    if (token) {
      loader.setRequestHeader({ 'Authorization': `Bearer ${token}` });
    }
  });

  // Center the geometry around its local origin to ensure it rotates correctly
  useMemo(() => {
    geometry.computeVertexNormals();
    geometry.center();
  }, [geometry]);

  return (
    <mesh 
      position={position} 
      onClick={onAddLandmark} 
      castShadow 
      receiveShadow
      scale={[0.1, 0.1, 0.1]} // Scaled down as raw STLs are often huge mathematically
      // Rotate the jaw out of conventional STL Z-up bounds to match the viewer
      rotation={[0, 0, 0]} 
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
  );
}

// Fallback mesh shown while the massive STL binaries are downloading
function FallbackMesh({ message }) {
  return (
    <group>
      <Html center>
        <div style={{ color: "#3B82F6", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", background: "white", padding: "4px 8px", borderRadius: 4, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          {message}
        </div>
      </Html>
    </group>
  );
}

function JawModel({ showUpper, showLower, highlightLandmarks, onAddLandmark, scans }) {
  const upperScanUrl = scans.find(s => s.file_type === "Upper Arch Segment")?.id;
  const lowerScanUrl = scans.find(s => s.file_type === "Lower Arch Segment")?.id;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}> {/* Rotate to lay flat */}
      {showUpper && upperScanUrl ? (
        <Suspense fallback={<FallbackMesh message="Downloading Upper STL..." />}>
          <STLMesh 
            url={`http://localhost:8000/api/analysis/scans/file/${upperScanUrl}`}
            position={[0, 0, 1.5]} 
            color="#E8F4FD"
            onAddLandmark={onAddLandmark}
          />
        </Suspense>
      ) : showUpper && (
         <FallbackMesh message="No Upper Arch found" />
      )}

      {showLower && lowerScanUrl ? (
        <Suspense fallback={<FallbackMesh message="Downloading Lower STL..." />}>
          <STLMesh 
            url={`http://localhost:8000/api/analysis/scans/file/${lowerScanUrl}`}
            position={[0, 0, -1.5]} 
            color="#F0F9FF"
            onAddLandmark={onAddLandmark}
          />
        </Suspense>
      ) : showLower && (
         <FallbackMesh message="No Lower Arch found" />
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

export default function ThreeViewer({ showUpper, showLower, highlightLandmarks, scans = [] }) {
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
                scans={scans}
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

import React, { useState, Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Text, Html, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Renders an actual STL mesh dynamically fetched securely from the backend
function STLMesh({ url, position, color, onAddLandmark }) {
  const geometry = useLoader(STLLoader, url, (loader) => {
    const token = localStorage.getItem("orthopar_token");
    if (token) {
      loader.setRequestHeader({ 'Authorization': `Bearer ${token}` });
    }
  });

  // Compute normals for lighting, but DO NOT call geometry.center().
  // Centering corrupts the World coordinates of the STL relative to the calculated ML landmarks!
  useMemo(() => {
    geometry.computeVertexNormals();
  }, [geometry]);

  return (
    <mesh 
      position={position} 
      onClick={onAddLandmark} 
      castShadow 
      receiveShadow
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
    <group>
      {showUpper && upperScanUrl ? (
        <Suspense fallback={<FallbackMesh message="Downloading Upper STL..." />}>
          <STLMesh 
            url={`http://localhost:8000/api/analysis/scans/file/${upperScanUrl}`}
            position={[0, 0, 0]} 
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
            position={[0, 0, 0]} 
            color="#F0F9FF"
            onAddLandmark={onAddLandmark}
          />
        </Suspense>
      ) : showLower && (
         <FallbackMesh message="No Lower Arch found" />
      )}
      
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
            
            <Center>
                <group rotation={[-Math.PI / 2, 0, 0]} scale={[0.1, 0.1, 0.1]}>
                    <JawModel 
                        showUpper={showUpper} 
                        showLower={showLower} 
                        highlightLandmarks={highlightLandmarks}
                        onAddLandmark={handlePointerDown} 
                        scans={scans}
                    />

                    {/* Render pre-calculated Backend AI landmarks aligned precisely in the same transformed coordinate space */}
                    {highlightLandmarks && scans.flatMap(s => {
                        // Dynamically hide landmarks if their parent anatomical mesh is toggled off by the user
                        if (s.file_type === "Upper Arch Segment" && !showUpper) return [];
                        if (s.file_type === "Lower Arch Segment" && !showLower) return [];
                        return s.landmarks || [];
                    }).map((lm, idx) => {
                        // ML models often output predictions in Centimeters (cm) or normalized scales to improve gradient stability.
                        // The raw STL meshes are natively structured in Millimeters (mm). 
                        // We must multiply the predicted coordinate vectors by 10 to scale them accurately onto the physical geometry!
                        const ML_SCALE = 10.0;
                        const pos = [lm.x * ML_SCALE, lm.y * ML_SCALE, lm.z * ML_SCALE];

                        return (
                            <group key={`ai-lm-${lm.id || idx}`} position={pos}>
                                <Sphere args={[0.6, 16, 16]}>
                                    <meshStandardMaterial color="#F59E0B" roughness={0.2} emissive="#F59E0B" emissiveIntensity={0.6} />
                                </Sphere>
                                {/* Display the physical anatomy name (e.g., L1M, R2D) floating above the sphere */}
                                <Text 
                                    position={[0, 1.2, 0]} 
                                    rotation={[Math.PI / 2, 0, 0]} 
                                    fontSize={1.4} 
                                    color="#FCD34D" 
                                    outlineWidth={0.08} 
                                    outlineColor="#1E293B"
                                >
                                    {lm.point_name}
                                </Text>
                            </group>
                        );
                    })}

                    {/* Render manually interacted frontend landmarks */}
                    {landmarks.map((pos, idx) => (
                        <Sphere key={idx} position={pos} args={[1.5, 16, 16]}>
                            <meshStandardMaterial color="#EF4444" roughness={0.2} metalness={0.1} />
                        </Sphere>
                    ))}
                </group>
            </Center>

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

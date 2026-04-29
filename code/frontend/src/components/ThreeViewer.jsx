import React, { useState, Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Text, Html, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Renders an actual STL mesh dynamically fetched securely from the backend
function STLMesh({ url, position, color, onAddLandmark, onLoadGeometry }) {
  const geometry = useLoader(STLLoader, url, (loader) => {
    const token = localStorage.getItem("orthopar_token");
    if (token) {
      loader.setRequestHeader({ 'Authorization': `Bearer ${token}` });
    }
  });

  // Compute normals for lighting, but DO NOT call geometry.center().
  // Centering corrupts the World coordinates of the STL relative to the calculated ML landmarks!
  React.useEffect(() => {
    if (geometry) {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      if (onLoadGeometry) {
        onLoadGeometry(geometry.boundingBox);
      }
    }
  }, [geometry, onLoadGeometry]);

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

// Per-mesh error boundary: stops a bad STL URL from crashing the whole viewer
class MeshErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <FallbackMesh message={`STL file unavailable — please re-upload`} />;
    }
    return this.props.children;
  }
}

function JawModel({ showUpper, showLower, highlightLandmarks, onAddLandmark, scans, onBoundsLoad }) {
  const upperScanUrl = scans.find(s => s.file_type === "Upper Arch Segment")?.id;
  const lowerScanUrl = scans.find(s => s.file_type === "Lower Arch Segment")?.id;

  return (
    <group>
      {showUpper && upperScanUrl ? (
        <MeshErrorBoundary>
          <Suspense fallback={<FallbackMesh message="Downloading Upper STL..." />}>
            <STLMesh 
              url={`http://localhost:8000/api/analysis/scans/file/${upperScanUrl}`}
              position={[0, 0, 0]} 
              color="#E8F4FD"
              onAddLandmark={onAddLandmark}
              onLoadGeometry={(box) => onBoundsLoad("Upper Arch Segment", box)}
            />
          </Suspense>
        </MeshErrorBoundary>
      ) : showUpper && (
         <FallbackMesh message="No Upper Arch found" />
      )}

      {showLower && lowerScanUrl ? (
        <MeshErrorBoundary>
          <Suspense fallback={<FallbackMesh message="Downloading Lower STL..." />}>
            <STLMesh 
              url={`http://localhost:8000/api/analysis/scans/file/${lowerScanUrl}`}
              position={[0, 0, 0]} 
              color="#F0F9FF"
              onAddLandmark={onAddLandmark}
              onLoadGeometry={(box) => onBoundsLoad("Lower Arch Segment", box)}
            />
          </Suspense>
        </MeshErrorBoundary>
      ) : showLower && (
         <FallbackMesh message="No Lower Arch found" />
      )}
      
    </group>
  );
}




export default function ThreeViewer({ showUpper, showLower, highlightLandmarks, scans = [] }) {
  const [landmarks, setLandmarks] = useState([]);
  const [stlBounds, setStlBounds] = useState({});

  const handlePointerDown = (e) => {
    e.stopPropagation();
    const { point } = e;
    setLandmarks(prev => [...prev, point]);
  };

  const handleBoundsLoad = React.useCallback((fileType, box) => {
    setStlBounds(prev => ({ ...prev, [fileType]: box }));
  }, []);

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
                        onBoundsLoad={handleBoundsLoad}
                    />

                    {/* Render pre-calculated Backend AI landmarks mapped dynamically to geometric bounds */}
                    {highlightLandmarks && scans.map(s => {
                        if (s.file_type === "Upper Arch Segment" && !showUpper) return null;
                        if (s.file_type === "Lower Arch Segment" && !showLower) return null;
                        if (!s.landmarks || s.landmarks.length === 0) return null;

                        // Retrieve the physical Mesh Bounding Box dimensions emitted by the STLLoader
                        const geoBox = stlBounds[s.file_type];

                        // Per-axis scale factors + origin offsets so landmarks align to the actual
                        // mesh bounding box regardless of coordinate-space aspect ratio or position.
                        let scaleX = 1.0, scaleY = 1.0, scaleZ = 1.0;
                        let offsetX = 0.0, offsetY = 0.0, offsetZ = 0.0;

                        if (geoBox && s.landmarks.length > 0) {
                            const xVals = s.landmarks.map(v => v.x);
                            const yVals = s.landmarks.map(v => v.y);
                            const zVals = s.landmarks.map(v => v.z);

                            const lmMinX = Math.min(...xVals), lmMaxX = Math.max(...xVals);
                            const lmMinY = Math.min(...yVals), lmMaxY = Math.max(...yVals);
                            const lmMinZ = Math.min(...zVals), lmMaxZ = Math.max(...zVals);

                            const lmSpanX = lmMaxX - lmMinX;
                            const lmSpanY = lmMaxY - lmMinY;
                            const lmSpanZ = lmMaxZ - lmMinZ;

                            const meshSpanX = geoBox.max.x - geoBox.min.x;
                            const meshSpanY = geoBox.max.y - geoBox.min.y;
                            const meshSpanZ = geoBox.max.z - geoBox.min.z;

                            // Independent per-axis scale so every dimension matches the mesh exactly
                            if (lmSpanX > 0.001) scaleX = meshSpanX / lmSpanX;
                            if (lmSpanY > 0.001) scaleY = meshSpanY / lmSpanY;
                            if (lmSpanZ > 0.001) scaleZ = meshSpanZ / lmSpanZ;

                            // Translate so the landmark cloud's minimum corner aligns with the
                            // mesh bounding-box minimum — eliminates origin drift when the mesh
                            // is not centred at (0, 0, 0).
                            offsetX = geoBox.min.x - lmMinX * scaleX;
                            offsetY = geoBox.min.y - lmMinY * scaleY;
                            offsetZ = geoBox.min.z - lmMinZ * scaleZ;
                        }

                        return (
                            <group key={`ai-lm-group-${s.id}`}>
                                {s.landmarks.map((lm, idx) => {
                                    const pos = [
                                        lm.x * scaleX + offsetX,
                                        lm.y * scaleY + offsetY,
                                        lm.z * scaleZ + offsetZ,
                                    ];
                                    return (
                                        <group key={`ai-lm-${lm.id || idx}`} position={pos}>
                                            <Sphere args={[0.6, 16, 16]}>
                                                <meshStandardMaterial color="#F59E0B" roughness={0.2} emissive="#F59E0B" emissiveIntensity={0.6} />
                                            </Sphere>
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

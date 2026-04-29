import React, { useState, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Text, Html, Center, Line } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// --- Sub-components for Modularity ---

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[120, 200, 100]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-100, 60, -90]} intensity={0.65} color="#dae6f5" />
      <directionalLight position={[0, -80, -150]} intensity={0.4} color="#fff6ee" />
      <directionalLight position={[0, -200, 60]} intensity={0.2} />
    </>
  );
}

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
      <meshStandardMaterial color="#c6c6c6" roughness={0.58} metalness={0.0} />
    </mesh>
  );
}

// Fallback mesh shown while the massive STL binaries are downloading
function FallbackMesh({ message }) {
  return (
    <group>
      <Html center>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3B82F6", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", background: "rgba(255, 255, 255, 0.9)", padding: "8px 16px", borderRadius: 8, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ border: '2px solid #E2E8F0', borderTop: '2px solid #3B82F6', borderRadius: '50%', width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
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




export default function ThreeViewer({ showUpper, showLower, highlightLandmarks, scans = [], activeMeasureMetric, measurePoints = [], onAddMeasurePoint }) {
  const [landmarks, setLandmarks] = useState([]);
  const [stlBounds, setStlBounds] = useState({});

  const handlePointerDown = (e) => {
    e.stopPropagation();
    const { point } = e;
    if (activeMeasureMetric && onAddMeasurePoint) {
      onAddMeasurePoint(point);
    } else {
      alert("Please select a metric to measure from the scorecard first.");
    }
  };

  const handleBoundsLoad = React.useCallback((fileType, box) => {
    setStlBounds(prev => ({ ...prev, [fileType]: box }));
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas 
            camera={{ position: [0, 8, 8], fov: 45 }} 
            shadows
            gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, antialias: true }}
        >
            <SceneLights />
            
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
                        let scaleX = 1.0;
                        let scaleY = 1.0;
                        let scaleZ = 1.0;

                        if (geoBox) {
                            const meshWidth = geoBox.max.x - geoBox.min.x;
                            const meshHeight = geoBox.max.y - geoBox.min.y;
                            const meshDepth = geoBox.max.z - geoBox.min.z;

                            const xVals = s.landmarks.map(v => v.x);
                            const yVals = s.landmarks.map(v => v.y);
                            const zVals = s.landmarks.map(v => v.z);

                            const lmWidth = Math.max(...xVals) - Math.min(...xVals);
                            const lmHeight = Math.max(...yVals) - Math.min(...yVals);
                            const lmDepth = Math.max(...zVals) - Math.min(...zVals);
                            
                            if (lmWidth > 0.001) scaleX = meshWidth / lmWidth;
                            if (lmHeight > 0.001) scaleY = meshHeight / lmHeight;
                            if (lmDepth > 0.001) scaleZ = meshDepth / lmDepth;
                        }

                        return (
                            <group key={`ai-lm-group-${s.id}`}>
                                {s.landmarks.map((lm, idx) => {
                                    const pos = [lm.x * scaleX, lm.y * scaleY, lm.z * scaleZ];
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

                </group>
            </Center>

            {/* Render manually interacted frontend landmarks in WORLD space */}
            {landmarks.map((pos, idx) => (
                <Sphere key={idx} position={pos} args={[0.15, 16, 16]}>
                    <meshStandardMaterial color="#EF4444" roughness={0.2} metalness={0.1} />
                </Sphere>
            ))}

            {/* Render active measurement points in WORLD space */}
            {measurePoints.map((pos, idx) => (
                <Sphere key={`measure-${idx}`} position={pos} args={[0.15, 16, 16]}>
                    <meshStandardMaterial color="#3B82F6" roughness={0.2} emissive="#3B82F6" emissiveIntensity={0.5} />
                </Sphere>
            ))}
            {measurePoints.length === 2 && (
                <Line
                    points={[
                        [measurePoints[0].x, measurePoints[0].y, measurePoints[0].z],
                        [measurePoints[1].x, measurePoints[1].y, measurePoints[1].z]
                    ]}
                    color="#3B82F6"
                    lineWidth={3}
                />
            )}

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

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlacedObject, RoomDimensions, MaterialItem, LightingConfig } from '../../types';
import { Camera, Eye, RotateCw, ZoomIn, ZoomOut, Maximize2, Sun, Moon } from 'lucide-react';

interface Room3DCanvasProps {
  dimensions: RoomDimensions;
  placedObjects: PlacedObject[];
  activeMaterial?: MaterialItem;
  lightingConfig: LightingConfig;
  selectedObjectId?: string | null;
  onSelectObject?: (id: string | null) => void;
  viewMode?: 'isometric' | 'walkthrough' | 'plan';
}

export const Room3DCanvas: React.FC<Room3DCanvasProps> = ({
  dimensions,
  placedObjects,
  activeMaterial,
  lightingConfig,
  selectedObjectId,
  onSelectObject,
  viewMode = 'isometric',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const roomMeshGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);

  const [fps, setFps] = useState(60);
  const [currentCameraPreset, setCurrentCameraPreset] = useState<'isometric' | 'walkthrough' | 'plan'>(viewMode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Detect software WebGL guard
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x14171d);
    scene.fog = new THREE.FogExp2(0x14171d, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(22, 16, 26);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Do not go underground
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.target.set(0, 2, 0);

    // Groups
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    roomMeshGroupRef.current = roomGroup;

    const furnitureGroup = new THREE.Group();
    scene.add(furnitureGroup);
    furnitureGroupRef.current = furnitureGroup;

    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // Base Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.6);
    lightsGroup.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff3db, 1.8);
    sunLight.position.set(15, 20, 10);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    const d = 18;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    lightsGroup.add(sunLight);
    sunLightRef.current = sunLight;

    // Contact Grid Floor Plane
    const gridHelper = new THREE.GridHelper(40, 40, 0x06b6d4, 0x242a36);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Animation / Render Loop with frame rate monitoring
    let frameId = 0;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.min(60, Math.round((frameCount * 1000) / (now - lastTime))));
        frameCount = 0;
        lastTime = now;
      }
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Update Room Geometry & Materials
  useEffect(() => {
    const roomGroup = roomMeshGroupRef.current;
    if (!roomGroup) return;

    // Clear previous room geometry
    while (roomGroup.children.length > 0) {
      const obj = roomGroup.children[0];
      roomGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    const length = dimensions.lengthFt; // X
    const width = dimensions.widthFt;   // Z
    const height = dimensions.ceilingHeightFt; // Y

    // Center room at origin
    const halfL = length / 2;
    const halfW = width / 2;

    // 1. FLOOR
    const floorGeo = new THREE.BoxGeometry(length, 0.2, width);
    const floorColor = activeMaterial?.color ? new THREE.Color(activeMaterial.color) : new THREE.Color(0x3b291a);
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: activeMaterial ? activeMaterial.roughness : 0.35,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.1, 0);
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);
    floorMeshRef.current = floorMesh;

    // 2. WALL FINISH MATERIAL
    const wallColor = new THREE.Color(0xd1d5db);
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.85,
      metalness: 0.05,
    });

    // Back Wall (North / -Z) with Large Window Cutout
    const backWallGroup = new THREE.Group();
    const windowW = Math.min(length * 0.6, 10);
    const windowH = Math.min(height * 0.7, 7);
    const sideSegW = (length - windowW) / 2;

    // Left side segment
    if (sideSegW > 0.1) {
      const leftSeg = new THREE.Mesh(new THREE.BoxGeometry(sideSegW, height, 0.4), wallMat);
      leftSeg.position.set(-halfL + sideSegW / 2, height / 2, -halfW - 0.2);
      leftSeg.castShadow = true;
      leftSeg.receiveShadow = true;
      backWallGroup.add(leftSeg);

      const rightSeg = new THREE.Mesh(new THREE.BoxGeometry(sideSegW, height, 0.4), wallMat);
      rightSeg.position.set(halfL - sideSegW / 2, height / 2, -halfW - 0.2);
      rightSeg.castShadow = true;
      rightSeg.receiveShadow = true;
      backWallGroup.add(rightSeg);
    }

    // Top lintel above window
    const topLintelH = height - windowH - 1.5;
    if (topLintelH > 0.1) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(windowW, topLintelH, 0.4), wallMat);
      lintel.position.set(0, height - topLintelH / 2, -halfW - 0.2);
      backWallGroup.add(lintel);
    }

    // Sill below window
    const sill = new THREE.Mesh(new THREE.BoxGeometry(windowW, 1.5, 0.4), wallMat);
    sill.position.set(0, 0.75, -halfW - 0.2);
    backWallGroup.add(sill);

    // Glass Window Pane with frame
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88c0d0,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
    });
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(windowW, windowH, 0.05), glassMat);
    glassPane.position.set(0, 1.5 + windowH / 2, -halfW - 0.2);
    backWallGroup.add(glassPane);

    // Black Architectural Window Mullions
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.1, windowH, 0.1), frameMat);
    mullionV.position.set(0, 1.5 + windowH / 2, -halfW - 0.2);
    backWallGroup.add(mullionV);

    roomGroup.add(backWallGroup);

    // Left Wall (West / -X)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, height, width), wallMat);
    leftWall.position.set(-halfL - 0.2, height / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Baseboards / Architectural Kickplate
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e232e, roughness: 0.4 });
    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(length, 0.4, 0.08), trimMat);
    trimBack.position.set(0, 0.2, -halfW + 0.04);
    roomGroup.add(trimBack);

    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, width), trimMat);
    trimLeft.position.set(-halfL + 0.04, 0.2, 0);
    roomGroup.add(trimLeft);
  }, [dimensions, activeMaterial]);

  // Update Dynamic Lighting & Solar Position
  useEffect(() => {
    const sun = sunLightRef.current;
    if (!sun) return;

    // Convert solar azimuth and altitude to 3D Cartesian coordinates
    const altRad = (lightingConfig.altitudeDeg * Math.PI) / 180;
    const azRad = (lightingConfig.solarOrientationDeg * Math.PI) / 180;
    const radius = 30;

    const x = radius * Math.cos(altRad) * Math.sin(azRad);
    const y = Math.max(4, radius * Math.sin(altRad));
    const z = radius * Math.cos(altRad) * Math.cos(azRad);

    sun.position.set(x, y, z);

    // Color temperature variation based on time of day
    const hour = parseInt(lightingConfig.diurnalTime.split(':')[0] || '16', 10);
    if (hour >= 17 || hour <= 7) {
      sun.color.setHex(0xffaa5e); // Warm sunset / sunrise golden hour
      sun.intensity = 1.2;
    } else if (hour >= 11 && hour <= 14) {
      sun.color.setHex(0xffffff); // Crisp noon sun
      sun.intensity = 2.0;
    } else {
      sun.color.setHex(0xffeed6);
      sun.intensity = 1.6;
    }

    // Update Luminaire Point Lights
    const lightsGroup = lightsGroupRef.current;
    if (!lightsGroup) return;

    // Keep base lights (first 2), clear previous luminaire points
    while (lightsGroup.children.length > 2) {
      lightsGroup.remove(lightsGroup.children[2]);
    }

    // Add point light for active luminaires
    lightingConfig.activeLuminaires.forEach((lum, idx) => {
      const color = lum.cct.includes('2700K') ? 0xffbb77 : 0xffffff;
      const light = new THREE.PointLight(color, lum.lumens / 700, 14, 1.5);
      // Stagger fixtures across ceiling / task areas
      light.position.set((idx - 1) * 3, dimensions.ceilingHeightFt - 1, (idx % 2 === 0 ? 1 : -1) * 2);
      light.castShadow = true;
      lightsGroup.add(light);
    });
  }, [lightingConfig, dimensions]);

  // Update Furniture 3D Procedural Models
  useEffect(() => {
    const group = furnitureGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    const halfL = dimensions.lengthFt / 2;
    const halfW = dimensions.widthFt / 2;

    placedObjects.forEach((obj) => {
      if (obj.visible === false) return;

      const objGroup = new THREE.Group();
      objGroup.name = obj.id;

      // Convert feet room coordinates to 3D center-relative coordinates
      const posX = obj.position.x - halfL;
      const posZ = obj.position.y - halfW;
      objGroup.position.set(posX, 0, posZ);
      objGroup.rotation.y = (obj.rotation * Math.PI) / 180;

      const isSelected = selectedObjectId === obj.id;
      const hasConflict = obj.clearanceConflict;

      // Convert dimensions from inches to feet
      const lFt = obj.dimensions.lengthIn / 12;
      const wFt = obj.dimensions.widthIn / 12;
      const hFt = obj.dimensions.heightIn / 12;

      // Assemble 3–12 part procedural models based on category or item type
      const cat = obj.category.toLowerCase();
      const name = obj.name.toLowerCase();

      if (cat.includes('seating') || name.includes('sofa') || name.includes('sectional')) {
        // --- 1. PROCEDURAL SOFA (Nocturne / Strata Curved Lounge) ---
        const fabricMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xe5855e : (hasConflict ? 0xf87171 : 0xd8c8b8),
          roughness: 0.88,
          metalness: 0.05,
        });
        const woodBaseMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.5 });

        // Base plinth
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(lFt, 0.15, wFt * 0.9), woodBaseMat);
        plinth.position.y = 0.075;
        plinth.castShadow = true;
        objGroup.add(plinth);

        // Main cushion seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(lFt * 0.96, hFt * 0.35, wFt * 0.85), fabricMat);
        seat.position.y = 0.15 + (hFt * 0.35) / 2;
        seat.castShadow = true;
        seat.receiveShadow = true;
        objGroup.add(seat);

        // Backrest (Curved / Segmented)
        const backrestH = hFt * 0.55;
        const backrest = new THREE.Mesh(new THREE.BoxGeometry(lFt * 0.96, backrestH, wFt * 0.28), fabricMat);
        backrest.position.set(0, 0.15 + hFt * 0.35 + backrestH / 2 - 0.05, -wFt * 0.28);
        backrest.castShadow = true;
        objGroup.add(backrest);

        // Left & Right Armrests
        const armH = hFt * 0.48;
        const armW = wFt * 0.8;
        const armThickness = lFt * 0.1;

        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(armThickness, armH, armW), fabricMat);
        leftArm.position.set(-lFt / 2 + armThickness / 2, 0.15 + armH / 2, 0);
        leftArm.castShadow = true;
        objGroup.add(leftArm);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(armThickness, armH, armW), fabricMat);
        rightArm.position.set(lFt / 2 - armThickness / 2, 0.15 + armH / 2, 0);
        rightArm.castShadow = true;
        objGroup.add(rightArm);
      } else if (cat.includes('table') || name.includes('table') || name.includes('plinth')) {
        // --- 2. PROCEDURAL COFFEE TABLE / PLINTH ---
        const stoneMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xe5855e : (hasConflict ? 0xf87171 : (name.includes('teak') ? 0x4a3525 : 0xdfd7cd)),
          roughness: name.includes('teak') ? 0.45 : 0.25,
          metalness: 0.1,
        });

        // Honed Top Slab with chamfer profile
        const topSlab = new THREE.Mesh(new THREE.CylinderGeometry(lFt * 0.45, lFt * 0.48, 0.15, 32), stoneMat);
        topSlab.scale.set(1, 1, wFt / lFt);
        topSlab.position.y = hFt - 0.075;
        topSlab.castShadow = true;
        topSlab.receiveShadow = true;
        objGroup.add(topSlab);

        // 3 Cylindrical Architectural Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.4 });
        const legGeo = new THREE.CylinderGeometry(0.12, 0.14, hFt - 0.15, 16);

        const leg1 = new THREE.Mesh(legGeo, legMat);
        leg1.position.set(-lFt * 0.25, (hFt - 0.15) / 2, -wFt * 0.2);
        leg1.castShadow = true;
        objGroup.add(leg1);

        const leg2 = new THREE.Mesh(legGeo, legMat);
        leg2.position.set(lFt * 0.25, (hFt - 0.15) / 2, -wFt * 0.2);
        leg2.castShadow = true;
        objGroup.add(leg2);

        const leg3 = new THREE.Mesh(legGeo, legMat);
        leg3.position.set(0, (hFt - 0.15) / 2, wFt * 0.25);
        leg3.castShadow = true;
        objGroup.add(leg3);
      } else if (cat.includes('storage') || name.includes('credenza') || name.includes('desk')) {
        // --- 3. PROCEDURAL CREDENZA / CONSOLE ---
        const bodyMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xe5855e : 0x1f242d,
          roughness: 0.4,
          metalness: 0.15,
        });
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xb59b6a, roughness: 0.2, metalness: 0.8 });

        // Credenza cabinet box
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(lFt, hFt * 0.8, wFt), bodyMat);
        cabinet.position.y = hFt * 0.2 + (hFt * 0.8) / 2;
        cabinet.castShadow = true;
        cabinet.receiveShadow = true;
        objGroup.add(cabinet);

        // Recessed base feet (4x)
        const footGeo = new THREE.CylinderGeometry(0.04, 0.04, hFt * 0.2, 8);
        const foot1 = new THREE.Mesh(footGeo, brassMat);
        foot1.position.set(-lFt / 2 + 0.3, (hFt * 0.2) / 2, -wFt / 2 + 0.2);
        objGroup.add(foot1);

        const foot2 = new THREE.Mesh(footGeo, brassMat);
        foot2.position.set(lFt / 2 - 0.3, (hFt * 0.2) / 2, -wFt / 2 + 0.2);
        objGroup.add(foot2);

        const foot3 = new THREE.Mesh(footGeo, brassMat);
        foot3.position.set(-lFt / 2 + 0.3, (hFt * 0.2) / 2, wFt / 2 - 0.2);
        objGroup.add(foot3);

        const foot4 = new THREE.Mesh(footGeo, brassMat);
        foot4.position.set(lFt / 2 - 0.3, (hFt * 0.2) / 2, wFt / 2 - 0.2);
        objGroup.add(foot4);
      } else if (cat.includes('lighting') || name.includes('luminaire') || name.includes('lamp')) {
        // --- 4. PROCEDURAL ARC LUMINAIRE ---
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xb59b6a, roughness: 0.2, metalness: 0.85 });
        const darkBaseMat = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.7 });

        // Heavy disc base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.08, 32), darkBaseMat);
        base.position.y = 0.04;
        base.castShadow = true;
        objGroup.add(base);

        // Vertical stem + curved neck
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, hFt * 0.75, 16), brassMat);
        stem.position.y = (hFt * 0.75) / 2;
        stem.castShadow = true;
        objGroup.add(stem);

        const hood = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.4, 32, 1, true), brassMat);
        hood.rotation.x = Math.PI;
        hood.position.set(0.6, hFt * 0.85, 0);
        objGroup.add(hood);

        // Point light for illumination glow
        const glow = new THREE.PointLight(0xffe4b5, 1.2, 8, 2);
        glow.position.set(0.6, hFt * 0.82, 0);
        objGroup.add(glow);
      } else if (cat.includes('rug') || name.includes('rug')) {
        // --- 5. PROCEDURAL WOOL RUG ---
        const rugMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xe5855e : 0x7b8794,
          roughness: 0.95,
          metalness: 0.02,
        });
        const rug = new THREE.Mesh(new THREE.BoxGeometry(lFt, 0.02, wFt), rugMat);
        rug.position.y = 0.01;
        rug.receiveShadow = true;
        objGroup.add(rug);
      } else {
        // --- 6. GENERIC ACCENT FURNITURE ---
        const genericMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xe5855e : 0x64748b,
          roughness: 0.5,
          metalness: 0.1,
        });
        const box = new THREE.Mesh(new THREE.BoxGeometry(lFt, hFt, wFt), genericMat);
        box.position.y = hFt / 2;
        box.castShadow = true;
        box.receiveShadow = true;
        objGroup.add(box);
      }

      // Selection bounding halo if active
      if (isSelected) {
        const ringGeo = new THREE.RingGeometry(lFt * 0.6, lFt * 0.65, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.02;
        objGroup.add(ring);
      }

      // Clearance Warning Marker if conflict detected
      if (hasConflict) {
        const alertRingGeo = new THREE.RingGeometry(lFt * 0.7, lFt * 0.75, 32);
        const alertRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const alertRing = new THREE.Mesh(alertRingGeo, alertRingMat);
        alertRing.rotation.x = Math.PI / 2;
        alertRing.position.y = 0.03;
        objGroup.add(alertRing);
      }

      group.add(objGroup);
    });
  }, [placedObjects, selectedObjectId, dimensions]);

  // Camera presets
  const applyCameraPreset = (preset: 'isometric' | 'walkthrough' | 'plan') => {
    setCurrentCameraPreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (preset === 'isometric') {
      camera.position.set(20, 16, 22);
      controls.target.set(0, 2, 0);
    } else if (preset === 'walkthrough') {
      // Eye level inside room
      camera.position.set(0, 4.5, dimensions.widthFt * 0.4);
      controls.target.set(0, 4.2, -dimensions.widthFt * 0.3);
    } else if (preset === 'plan') {
      // Direct Top-Down orthographic style
      camera.position.set(0.01, 28, 0);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const camera = cameraRef.current;
    if (!camera) return;
    const factor = direction === 'in' ? 0.85 : 1.15;
    camera.position.multiplyScalar(factor);
    camera.updateProjectionMatrix();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[460px] bg-[#14171D] overflow-hidden rounded-xl border border-[#28303F]/60 flex flex-col">
      {/* Top 3D Viewport HUD Status Bar */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#181C24]/90 backdrop-blur border border-[#28303F] rounded-lg text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            <span>THREE.JS PBR CORE</span>
            <span className="text-slate-500">|</span>
            <span className="text-[#06B6D4]">{fps} FPS</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181C24]/90 backdrop-blur border border-[#28303F] rounded-lg text-xs font-mono text-slate-300">
            <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>ALT {lightingConfig.altitudeDeg}°</span>
            <span className="text-slate-500">•</span>
            <span>AZ {lightingConfig.solarOrientationDeg}°</span>
          </div>
        </div>

        {/* View mode buttons */}
        <div className="flex items-center gap-1 bg-[#181C24]/90 backdrop-blur border border-[#28303F] rounded-lg p-1 pointer-events-auto">
          <button
            onClick={() => applyCameraPreset('isometric')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              currentCameraPreset === 'isometric'
                ? 'bg-[#E5855E] text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#242A36]'
            }`}
          >
            3D Isometric
          </button>
          <button
            onClick={() => applyCameraPreset('walkthrough')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              currentCameraPreset === 'walkthrough'
                ? 'bg-[#E5855E] text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#242A36]'
            }`}
          >
            Walkthrough
          </button>
          <button
            onClick={() => applyCameraPreset('plan')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              currentCameraPreset === 'plan'
                ? 'bg-[#E5855E] text-white font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#242A36]'
            }`}
          >
            Top Plan
          </button>
        </div>
      </div>

      {/* Primary WebGL Canvas Mount Container */}
      <div ref={containerRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Floating Bottom Control Bar */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="text-[11px] font-mono text-slate-400 bg-[#181C24]/85 px-3 py-1.5 rounded-lg border border-[#28303F] pointer-events-auto">
          Left Drag: Rotate Orbit • Right Drag: Pan • Scroll: Zoom In/Out
        </div>

        <div className="flex items-center gap-1.5 bg-[#181C24]/90 border border-[#28303F] p-1 rounded-lg pointer-events-auto">
          <button
            onClick={() => handleZoom('in')}
            title="Zoom In"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-[#242A36] rounded"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            title="Zoom Out"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-[#242A36] rounded"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyCameraPreset(currentCameraPreset)}
            title="Reset Angle"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-[#242A36] rounded"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-[#242A36] rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

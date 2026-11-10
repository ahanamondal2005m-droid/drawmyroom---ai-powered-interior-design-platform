/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, UserProfile, CatalogItem, DesignVariation } from './types';
import { PublicNavbar } from './components/public/PublicNavbar';
import { LandingPage } from './components/public/LandingPage';
import { AboutPage } from './components/public/AboutPage';
import { HowItWorksPage } from './components/public/HowItWorksPage';
import { FeaturesPage } from './components/public/FeaturesPage';
import { ContactPage } from './components/public/ContactPage';
import { AuthModal } from './components/public/AuthModal';

import { StudioLayout } from './components/studio/StudioLayout';
import { DashboardView } from './components/studio/DashboardView';
import { SpatialEditorView } from './components/studio/SpatialEditorView';
import { FurnitureCatalogView } from './components/studio/FurnitureCatalogView';
import { MaterialsStudioView } from './components/studio/MaterialsStudioView';
import { LightingSimulationView } from './components/studio/LightingSimulationView';
import { EstimatesBoQView } from './components/studio/EstimatesBoQView';
import { ProjectsView } from './components/studio/ProjectsView';
import { SavedDesignsView } from './components/studio/SavedDesignsView';
import { DesignerConnectView } from './components/studio/DesignerConnectView';
import { SettingsView } from './components/studio/SettingsView';

// Default Fallback Project (Reflecting the 6 Stitch Screenshots)
const INITIAL_PROJECT: Project = {
  id: 'proj_default_loft',
  userId: 'user_default',
  name: 'Modern Loft Living Room',
  roomType: 'Living Room',
  dimensions: {
    lengthFt: 18.0,
    widthFt: 14.0,
    ceilingHeightFt: 10.0,
    unit: 'ft',
  },
  budget: {
    totalCap: 2200,
    committed: 1850,
    currency: 'USD',
  },
  sketch: {
    uploaded: false,
    url: '',
    fileName: '',
    detectedFeatures: {
      walls: 4,
      doors: 1,
      windows: 2,
      usableAreaSqFt: 252,
      confidence: 'High',
      aspectRatio: '1.28:1',
      orientation: 'North-East',
    },
  },
  clearanceSettings: {
    egressPathInches: 36,
    doorArcSwing: true,
  },
  placedObjects: [
    {
      id: 'obj_1',
      catalogId: 'furn_sofa_nocturne',
      name: 'Nocturne Curved Sectional',
      category: 'Seating',
      dimensions: { lengthIn: 96, widthIn: 42, heightIn: 31 },
      position: { x: 9.0, y: 7.0, z: 0 },
      rotation: 0,
      price: 1299,
      material: 'Sand Bouclé',
      vendor: 'CB2 Contract',
      anchorType: 'L-ANCHOR',
      clearanceConflict: false,
      visible: true,
      modelType: 'sofa',
    },
    {
      id: 'obj_2',
      catalogId: 'furn_table_organic_teak',
      name: 'Organic Teak Coffee Table',
      category: 'Tables & Desks',
      dimensions: { lengthIn: 48, widthIn: 24, heightIn: 16 },
      position: { x: 9.0, y: 9.2, z: 0 },
      rotation: 0,
      price: 379,
      material: 'Dark Walnut',
      vendor: 'CB2 Contract',
      anchorType: 'FREE',
      clearanceConflict: true,
      conflictMessage: 'Organic Coffee Table is within 14.5 in of Sectional (36 in path required).',
      visible: true,
      modelType: 'table',
    },
    {
      id: 'obj_3',
      catalogId: 'furn_credenza_aurelia',
      name: 'Aurelia Media Credenza',
      category: 'Storage & Media',
      dimensions: { lengthIn: 72, widthIn: 18, heightIn: 20 },
      position: { x: 9.0, y: 1.5, z: 0 },
      rotation: 0,
      price: 490,
      material: 'Ebonized Ash',
      vendor: 'Muuto Studio',
      anchorType: 'WALL-ANCHOR',
      clearanceConflict: false,
      visible: true,
      modelType: 'credenza',
    },
    {
      id: 'obj_4',
      catalogId: 'furn_luminaire_aura',
      name: 'Aura Arc Luminaire',
      category: 'Lighting',
      dimensions: { lengthIn: 28, widthIn: 28, heightIn: 78 },
      position: { x: 14.0, y: 6.5, z: 0 },
      rotation: 45,
      price: 240,
      material: 'Satin Brass & Cast Iron',
      vendor: 'Flos Studio',
      anchorType: 'FREE',
      clearanceConflict: false,
      visible: true,
      modelType: 'lamp',
    },
    {
      id: 'obj_5',
      catalogId: 'furn_rug_basalt',
      name: 'Basalt Micro-Ribbed Wool Rug',
      category: 'Rugs & Textiles',
      dimensions: { lengthIn: 120, widthIn: 96, heightIn: 0.5 },
      position: { x: 9.0, y: 7.5, z: 0 },
      rotation: 0,
      price: 312,
      material: 'Nordic Wool / Slate',
      vendor: 'CB2 Contract',
      anchorType: 'FLOOR',
      clearanceConflict: false,
      visible: true,
      modelType: 'rug',
    },
  ],
  materialSpecs: {
    activePlane: 'SURF_FLR_01',
    activeMaterialId: 'mat_wood_chevron_smoked_oak',
    materials: [
      {
        id: 'mat_wood_chevron_smoked_oak',
        plane: 'SURF_FLR_01',
        name: 'Chevron Smoked Oak',
        category: 'FLOORING',
        origin: 'Black Forest, Germany',
        pricePerSqFt: 11.20,
        roughness: 0.35,
        normalDepthMm: 1.28,
        vocRating: 'Ultra-Low',
        scratchIndex: 'AC5 High-Com',
        slipResistance: 'R10 / DCOF 0.52',
        color: '#4A3525',
        warranty: '25-Yr Res. / 10-Yr Light Comm.',
        activeMaps: { albedo: true, rough: true, normal: true, resolution: '4096 px²' },
      },
      {
        id: 'mat_wall_microcement_slate',
        plane: 'SURF_WALL_01',
        name: 'Microcement Slate',
        category: 'WALL FINISH',
        origin: 'Milan, Italy',
        pricePerSqFt: 9.50,
        roughness: 0.48,
        normalDepthMm: 0.85,
        vocRating: 'A+ Pure',
        scratchIndex: 'Heavy Traffic',
        slipResistance: 'N/A',
        color: '#71757E',
        warranty: '15-Yr Commercial',
        activeMaps: { albedo: true, rough: true, normal: true, resolution: '4096 px²' },
      },
    ],
  },
  lightingConfig: {
    solarOrientationDeg: 135.4,
    altitudeDeg: 42,
    directDni: 840,
    zenithLux: 38200,
    diurnalTime: '16:45',
    casementWidthFt: 10.0,
    casementHeightFt: 7.0,
    windowToWallRatio: 42.8,
    glazingSpec: '(SHGC) 0.38 Low-E',
    linenDrapeDiffusion: true,
    totalLumenBudget: 3800,
    allocatedLumens: 3450,
    daylightLumens: 1720,
    artificialLumens: 1730,
    activeLuminaires: [
      {
        id: 'lum_1',
        name: 'Architectural Linear Cove',
        type: 'Linear Cove',
        lumens: 950,
        cct: '2700K',
        powerWatts: 18,
        status: 'Active',
      },
      {
        id: 'lum_2',
        name: 'Flos Style Brass Arc',
        type: 'Task Arc',
        lumens: 480,
        cct: '3000K',
        powerWatts: 8,
        status: 'Active',
      },
      {
        id: 'lum_3',
        name: 'Flush Gimbal Cans (3x)',
        type: 'Spot Gimbal',
        lumens: 300,
        cct: '3000K',
        powerWatts: 12,
        status: 'Active',
      },
    ],
    circadianScorePercent: 96,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const INITIAL_USER: UserProfile = {
  id: 'user_default',
  name: 'Ahana Mondal',
  email: 'ahananmondal2005m@gmail.com',
  role: 'Lead Architect',
  studioName: 'Mondal Atelier & Studio',
  preferredCurrency: 'USD',
  preferredUnit: 'ft',
};

export default function App() {
  // Navigation State
  const [appMode, setAppMode] = useState<'public' | 'studio'>('public');
  const [currentPublicPage, setCurrentPublicPage] = useState<string>('home');
  const [currentStudioTab, setCurrentStudioTab] = useState<string>('spatial');

  // Auth State
  const [user, setUser] = useState<UserProfile | null>(INITIAL_USER);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Projects State
  const [projects, setProjects] = useState<Project[]>([INITIAL_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useState<string>(INITIAL_PROJECT.id);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);

  // Fetch initial project list from backend
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setActiveProjectId(data[0].id);
        }
      })
      .catch((err) => console.log('Using local project initial state:', err));

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECT;

  // Update active project helper
  const handleUpdateActiveProject = (updatedFields: Partial<Project>) => {
    const updatedProject = {
      ...activeProject,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    const nextProjects = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));
    setProjects(nextProjects);

    // Sync to backend persistent store
    fetch(`/api/projects/${activeProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProject),
    }).catch((err) => console.error('Failed to sync project:', err));
  };

  // Create new project
  const handleCreateProject = (projectData: Partial<Project>) => {
    const newProj: Project = {
      ...INITIAL_PROJECT,
      id: `proj_${Date.now()}`,
      name: projectData.name || 'Untitled Room Design',
      roomType: projectData.roomType || 'Living Room',
      dimensions: projectData.dimensions || { lengthFt: 18, widthFt: 14, ceilingHeightFt: 10, unit: 'ft' },
      budget: projectData.budget || { totalCap: 2500, committed: 0, currency: 'USD' },
      placedObjects: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects([newProj, ...projects]);
    setActiveProjectId(newProj.id);
    setCurrentStudioTab('spatial');

    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProj),
    }).catch((err) => console.error('Failed to create project:', err));
  };

  // Delete project
  const handleDeleteProject = (id: string) => {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    if (activeProjectId === id && next.length > 0) {
      setActiveProjectId(next[0].id);
    }

    fetch(`/api/projects/${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete project:', err)
    );
  };

  // Place Catalog item into spatial room
  const handlePlaceCatalogItem = (item: CatalogItem) => {
    const newPlaced: Project['placedObjects'][0] = {
      id: `obj_${Date.now()}`,
      catalogId: item.id,
      name: item.name,
      category: item.category,
      dimensions: { ...item.dimensions },
      position: {
        x: activeProject.dimensions.lengthFt / 2,
        y: activeProject.dimensions.widthFt / 2,
        z: 0,
      },
      rotation: 0,
      price: item.price,
      material: item.material,
      vendor: item.vendor,
      anchorType: 'FREE',
      clearanceConflict: false,
      visible: true,
      modelType: item.modelType,
    };

    const nextObjects = [...activeProject.placedObjects, newPlaced];
    const totalCommitted = nextObjects.reduce((acc, curr) => acc + curr.price, 0);

    handleUpdateActiveProject({
      placedObjects: nextObjects,
      budget: { ...activeProject.budget, committed: totalCommitted },
    });
  };

  // Restore snapshot from saved variations
  const handleRestoreDesign = (snapshot: DesignVariation['snapshotData']) => {
    const totalCommitted = snapshot.placedObjects.reduce((acc, curr) => acc + curr.price, 0);
    handleUpdateActiveProject({
      dimensions: snapshot.dimensions,
      placedObjects: snapshot.placedObjects,
      materialSpecs: {
        ...activeProject.materialSpecs,
        materials: snapshot.materials,
      },
      lightingConfig: snapshot.lightingConfig,
      budget: { ...activeProject.budget, committed: totalCommitted },
    });
  };

  // Auth Modal openers
  const openAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  // ==========================================
  // RENDER APP
  // ==========================================
  return (
    <div className="min-h-screen bg-[#14171D] text-slate-100 flex flex-col font-sans">
      {appMode === 'public' ? (
        /* PUBLIC WEBSITE VIEW */
        <div className="flex-1 flex flex-col">
          <PublicNavbar
            currentPublicPage={currentPublicPage}
            onNavigatePublic={(p) => setCurrentPublicPage(p)}
            onOpenWorkspace={() => setAppMode('studio')}
            user={user}
            onOpenAuth={openAuth}
            onLogout={() => setUser(null)}
          />

          <main className="flex-1 flex flex-col">
            {currentPublicPage === 'home' && (
              <LandingPage
                onStartDesigning={() => {
                  setAppMode('studio');
                  setCurrentStudioTab('spatial');
                }}
                onNavigatePublic={(p) => setCurrentPublicPage(p)}
                onOpenAuth={openAuth}
              />
            )}
            {currentPublicPage === 'about' && (
              <AboutPage
                onStartDesigning={() => {
                  setAppMode('studio');
                  setCurrentStudioTab('spatial');
                }}
                onNavigatePublic={(p) => setCurrentPublicPage(p)}
              />
            )}
            {currentPublicPage === 'how-it-works' && (
              <HowItWorksPage
                onStartDesigning={() => {
                  setAppMode('studio');
                  setCurrentStudioTab('spatial');
                }}
              />
            )}
            {currentPublicPage === 'features' && (
              <FeaturesPage
                onStartDesigning={() => {
                  setAppMode('studio');
                  setCurrentStudioTab('spatial');
                }}
              />
            )}
            {currentPublicPage === 'contact' && <ContactPage />}
          </main>
        </div>
      ) : (
        /* AUTHENTICATED WORKSPACE STUDIO VIEW */
        <StudioLayout
          currentTab={currentStudioTab}
          onSelectTab={(tab) => setCurrentStudioTab(tab)}
          projects={projects}
          activeProject={activeProject}
          onSelectProject={(id) => setActiveProjectId(id)}
          onOpenNewProjectModal={() => setCurrentStudioTab('projects')}
          user={user || INITIAL_USER}
          onLogout={() => {
            setUser(null);
            setAppMode('public');
          }}
          onReturnToPublic={() => setAppMode('public')}
        >
          {currentStudioTab === 'dashboard' && (
            <DashboardView
              project={activeProject}
              onNavigateToTab={(tab) => setCurrentStudioTab(tab)}
              onOpenNewProjectModal={() => setCurrentStudioTab('projects')}
            />
          )}

          {currentStudioTab === 'spatial' && (
            <SpatialEditorView
              project={activeProject}
              onUpdateProject={handleUpdateActiveProject}
              onNavigateToTab={(tab) => setCurrentStudioTab(tab)}
              onPlaceCatalogItem={handlePlaceCatalogItem}
            />
          )}

          {currentStudioTab === 'catalog' && (
            <FurnitureCatalogView
              project={activeProject}
              onPlaceCatalogItem={handlePlaceCatalogItem}
              onNavigateToTab={(tab) => setCurrentStudioTab(tab)}
            />
          )}

          {currentStudioTab === 'materials' && (
            <MaterialsStudioView
              project={activeProject}
              onUpdateProject={handleUpdateActiveProject}
              onNavigateToTab={(tab) => setCurrentStudioTab(tab)}
            />
          )}

          {currentStudioTab === 'lighting' && (
            <LightingSimulationView
              project={activeProject}
              onUpdateProject={handleUpdateActiveProject}
              onNavigateToTab={(tab) => setCurrentStudioTab(tab)}
            />
          )}

          {currentStudioTab === 'estimates' && (
            <EstimatesBoQView
              project={activeProject}
              onUpdateProject={handleUpdateActiveProject}
              onNavigateToTab={(tab) => setCurrentStudioTab(tab)}
            />
          )}

          {currentStudioTab === 'projects' && (
            <ProjectsView
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={(id) => setActiveProjectId(id)}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onNavigateToTab={(tab) => setCurrentStudioTab(tab)}
            />
          )}

          {currentStudioTab === 'designs' && (
            <SavedDesignsView
              project={activeProject}
              onRestoreDesign={handleRestoreDesign}
              onNavigateToTab={(tab) => setCurrentStudioTab(tab)}
            />
          )}

          {currentStudioTab === 'designers' && (
            <DesignerConnectView project={activeProject} />
          )}

          {currentStudioTab === 'settings' && (
            <SettingsView
              project={activeProject}
              onUpdateProject={handleUpdateActiveProject}
              user={user || INITIAL_USER}
              onUpdateUser={(updated) => setUser({ ...(user || INITIAL_USER), ...updated })}
            />
          )}
        </StudioLayout>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(u) => {
          setUser(u);
          setAppMode('studio');
        }}
      />
    </div>
  );
}

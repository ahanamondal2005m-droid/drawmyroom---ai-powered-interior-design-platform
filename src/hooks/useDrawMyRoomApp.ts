import { useEffect, useState } from 'react';
import { CatalogItem, DesignVariation, Project, UserProfile } from '../types';
import { DEFAULT_PROJECT as INITIAL_PROJECT, DEFAULT_USER as INITIAL_USER } from '../data/seed';
import * as api from '../services/api';

/**
 * Application state and actions for the DrawMyRoom shell.
 *
 * Owns navigation (public site <-> studio + tab/page switching), the current
 * user, the project list, and every project mutation — including the backend
 * sync calls. Extracted verbatim from App.tsx so App is a pure view.
 */
export function useDrawMyRoomApp() {
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
    api.listProjects()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setActiveProjectId(data[0].id);
        }
      })
      .catch((err) => console.log('Using local project initial state:', err));

    api.getCurrentUser()
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
    api.updateProject(activeProject.id, updatedProject).catch((err) =>
      console.error('Failed to sync project:', err)
    );
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

    api.createProject(newProj).catch((err) => console.error('Failed to create project:', err));
  };

  // Delete project
  const handleDeleteProject = (id: string) => {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    if (activeProjectId === id && next.length > 0) {
      setActiveProjectId(next[0].id);
    }

    api.deleteProject(id).catch((err) => console.error('Failed to delete project:', err));
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

  return {
    // navigation
    appMode,
    setAppMode,
    currentPublicPage,
    setCurrentPublicPage,
    currentStudioTab,
    setCurrentStudioTab,
    // auth
    user,
    setUser,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    openAuth,
    // projects
    projects,
    activeProjectId,
    setActiveProjectId,
    newProjectModalOpen,
    setNewProjectModalOpen,
    activeProject,
    handleUpdateActiveProject,
    handleCreateProject,
    handleDeleteProject,
    handlePlaceCatalogItem,
    handleRestoreDesign,
  };
}

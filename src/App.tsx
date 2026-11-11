/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DEFAULT_USER as INITIAL_USER } from './data/seed';
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
import { useDrawMyRoomApp } from './hooks/useDrawMyRoomApp';

export default function App() {
  const {
    appMode,
    setAppMode,
    currentPublicPage,
    setCurrentPublicPage,
    currentStudioTab,
    setCurrentStudioTab,
    user,
    setUser,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    openAuth,
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    handleUpdateActiveProject,
    handleCreateProject,
    handleDeleteProject,
    handlePlaceCatalogItem,
    handleRestoreDesign,
  } = useDrawMyRoomApp();

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

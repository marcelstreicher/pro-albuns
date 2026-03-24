import React, { useState } from 'react';
import ProjectWizard from './ProjectWizard';
import PageManager from './PageManager';
import ConfirmDialog from './ConfirmDialog';
import { useProjectStore } from '../store/useProjectStore';

const Dashboard: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [showPageManager, setShowPageManager] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const { projects, loadProject, deleteProjectById } = useProjectStore();

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const selectedProject = projects.find(p => p.id === projectToDelete);

  return (
    <main className="flex-1 bg-surface-dim p-8 md:p-12 overflow-y-auto">
      {showWizard && <ProjectWizard onClose={() => setShowWizard(false)} />}
      {showPageManager && <PageManager onClose={() => setShowPageManager(false)} />}
      
      <ConfirmDialog
        isOpen={!!projectToDelete}
        title="Excluir Projeto"
        message={`Deseja realmente excluir o projeto "${selectedProject?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (projectToDelete) deleteProjectById(projectToDelete);
          setProjectToDelete(null);
        }}
        onCancel={() => setProjectToDelete(null)}
      />

      {/* Header Section */}
      <section className="mb-16 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-headline font-extrabold text-on-background tracking-tighter mb-4 leading-none text-primary uppercase">
            Workspaces
          </h1>
          <p className="text-on-surface-variant font-body text-lg leading-relaxed max-w-lg">
            Curate your visual narratives. Access your high-fidelity album drafts and lab presets in one silent gallery.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowPageManager(true)}
            className="px-8 py-4 bg-surface-container-high border border-outline-variant/30 text-on-surface font-headline font-bold uppercase tracking-widest text-[10px] hover:bg-surface-bright transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">settings_input_component</span>
            Gabaritos
          </button>
          <button 
            onClick={() => setShowWizard(true)}
            className="px-8 py-4 primary-gradient text-on-primary font-headline font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 rounded shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Project
          </button>
        </div>
      </section>

      {/* Project Grid */}
      <section className="mb-16">
        <h3 className="text-xs font-headline font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-8 flex items-center gap-3">
          Your Projects
          <span className="w-8 h-[1px] bg-outline-variant/20"></span>
          <span className="text-[10px] text-primary">{projects.length} Total</span>
        </h3>

        {projects.length === 0 ? (
          <div className="h-64 border-2 border-dashed border-outline-variant/20 rounded flex flex-col items-center justify-center bg-surface-container-lowest/50 group hover:border-primary/30 transition-all">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-4 group-hover:text-primary/50 transition-all">folder_open</span>
              <p className="text-on-surface-variant font-body text-sm mb-6">Nenhum projeto encontrado. Comece algo novo.</p>
              <button 
                onClick={() => setShowWizard(true)}
                className="px-6 py-2 border border-primary text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all"
              >
                Criar Primeiro Projeto
              </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.sort((a, b) => b.lastUpdated - a.lastUpdated).map((project) => (
              <div 
                key={project.id}
                className="group relative bg-surface-container border border-outline-variant/10 hover:border-primary/30 hover:bg-surface-container-high transition-all duration-300 rounded overflow-hidden flex flex-col h-full"
              >
                {/* Project Preview Placeholder */}
                <div className="aspect-[3/2] bg-surface-container-lowest relative overflow-hidden flex items-center justify-center border-b border-outline-variant/5">
                  <div className="opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-7xl">photo_album</span>
                  </div>
                  
                  {/* Floating Action Buttons */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300 z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project.id);
                      }}
                      className="w-8 h-8 rounded-full bg-surface-bright/90 backdrop-blur shadow text-error hover:bg-error hover:text-white flex items-center justify-center transition-all"
                      title="Excluir"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center bg-surface-bright/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => loadProject(project.id)}
                      className="px-6 py-2 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest shadow-xl scale-95 group-hover:scale-100 transition-all"
                    >
                      Abrir Projeto
                    </button>
                  </div>
                </div>

                {/* Project Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-headline font-bold text-on-surface leading-tight truncate pr-4">
                        {project.name}
                      </h3>
                      <span className="text-[10px] text-primary font-bold">{project.spreads.length} Lâminas / {project.spreads.length * 2} páginas</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">
                      Atualizado em {formatDate(project.lastUpdated)}
                    </p>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {project.media.slice(0, 3).map((m, i) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-surface-container overflow-hidden bg-surface-container-lowest">
                          <img src={m.path} alt="" className="w-full h-full object-cover grayscale" />
                        </div>
                      ))}
                      {project.media.length > 3 && (
                        <div className="w-5 h-5 rounded-full border border-surface-container bg-surface-container-high flex items-center justify-center text-[8px] font-bold text-on-surface-variant text-center">
                          +{project.media.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-on-surface-variant ml-1">{project.media.length} fotos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lab Presets Strip */}
      <section className="mb-16 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xs font-headline font-bold uppercase tracking-[0.2em] text-on-surface-variant">Lab Presets & Dimensions</h3>
          <button className="text-[10px] text-primary uppercase font-bold tracking-widest hover:underline">Manage All</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="group cursor-pointer">
            <div className="aspect-square bg-surface-container-lowest border border-outline-variant/10 group-hover:border-primary/50 transition-all flex flex-col items-center justify-center p-4 rounded">
              <div className="w-16 h-16 border-2 border-outline-variant/40 group-hover:border-primary/60 transition-all mb-4"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">10 x 10</span>
              <span className="text-[9px] text-on-surface-variant uppercase mt-1">Square Classic</span>
            </div>
          </div>
          <div className="group cursor-pointer">
            <div className="aspect-square bg-surface-container-lowest border border-outline-variant/10 group-hover:border-primary/50 transition-all flex flex-col items-center justify-center p-4 rounded">
              <div className="w-20 h-14 border-2 border-outline-variant/40 group-hover:border-primary/60 transition-all mb-4"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">12 x 8</span>
              <span className="text-[9px] text-on-surface-variant uppercase mt-1">Landscape Pro</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;

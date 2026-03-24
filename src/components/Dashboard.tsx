import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <main className="flex-1 bg-surface-dim p-8 md:p-12 overflow-y-auto">
      {/* Header Section */}
      <section className="mb-16 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-headline font-extrabold text-on-background tracking-tighter mb-4 leading-none">
            WORKSPACE
          </h1>
          <p className="text-on-surface-variant font-body text-lg leading-relaxed max-w-lg">
            Curate your visual narratives. Access your high-fidelity album drafts and lab presets in one silent gallery.
          </p>
        </div>
        <div className="flex gap-4">
          <button className="px-8 py-4 bg-surface-container-high border border-outline-variant/30 text-on-surface font-headline font-bold uppercase tracking-widest text-xs hover:bg-surface-bright transition-all">
            Lab Settings
          </button>
          <button className="px-8 py-4 primary-gradient text-on-primary font-headline font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 rounded">
            <span className="material-symbols-outlined text-sm">add</span>
            New Project
          </button>
        </div>
      </section>

      {/* Bento Grid of Recent Projects */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-16">
        <div className="md:col-span-8 group relative overflow-hidden bg-surface-container-low aspect-[16/9] border border-outline-variant/10 rounded">
          <img alt="Featured Project" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6PoC0VePgRppCGWnMy3xUFjj2DNurS9oVjih8QViRcB1WTssIFDslt9dhi04co-DvsyUKotvP_PGUpAavcYfCqBxUAiT6f6pGJFxgK7M7BNi8F2h3XCt5SrlznJkBxFiGC68MWZjG1-45y5sNkfoYLhzcPjRu4b7rkZjzpV7SCjj3McrSxPArS_wNYmvKvWIYpp3kVVUe88RGoJBXbSBJT3aM0D29Hk1spIrMORwmdGH9_0PsSxjQS3okx9lmAUHUp1OUenWVYfjG"/>
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent opacity-80"></div>
          <div className="absolute bottom-0 left-0 p-8 w-full flex justify-between items-end">
            <div>
              <span className="px-2 py-1 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest mb-3 inline-block">Active Edit</span>
              <h2 className="text-3xl font-headline font-bold text-on-background">Florence Elopement</h2>
              <p className="text-on-surface-variant font-body text-sm mt-1">Last edited 2 hours ago • 42 Spreads</p>
            </div>
            <button className="bg-surface-bright/80 backdrop-blur-md p-4 rounded-full text-on-surface hover:bg-primary hover:text-on-primary transition-all">
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="md:col-span-4 grid grid-rows-2 gap-6">
          <div className="bg-surface-container border border-outline-variant/10 p-6 flex flex-col justify-between hover:bg-surface-container-high transition-all rounded">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Draft • Oct 12</span>
              <button className="material-symbols-outlined text-on-surface-variant">more_vert</button>
            </div>
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface leading-tight">Coastal Minimalist</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                <span className="text-xs text-on-surface-variant">Lab: Artisan Press 10x10</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant/10 p-6 flex flex-col justify-between hover:bg-surface-container-high transition-all rounded">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Completed • Sept 28</span>
              <button className="material-symbols-outlined text-on-surface-variant">more_vert</button>
            </div>
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface leading-tight">Industrial Loft Series</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                <span className="text-xs text-on-surface-variant">Lab: Graphite Matt 12x12</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Presets & Sizes Strip */}
      <section className="mb-16">
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

import React, { useState, useEffect } from 'react';
import TopNavBar from './components/TopNavBar';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import SpreadNavigator from './components/SpreadNavigator';
import Filmstrip from './components/Filmstrip';
import Inspector from './components/Inspector';
import Biblioteca from './components/Biblioteca';
import Exportacao from './components/Exportacao';
import Dashboard from './components/Dashboard';
import LayoutDesigner from './components/LayoutDesigner';
import { useProjectStore } from './store/useProjectStore';

const TOAST_ICONS: Record<string, string> = {
  success: 'check_circle',
  info: 'info',
  warning: 'warning',
};
const TOAST_COLORS: Record<string, string> = {
  success: 'text-primary',
  info: 'text-secondary',
  warning: 'text-tertiary',
};

const App: React.FC = () => {
  const { currentView, toast, clearToast, activeSpreadIndex } = useProjectStore();

  // Lifted state shared between Canvas and Inspector
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null);
  // Canvas zoom level (1 = 100%)
  const [canvasZoom, setCanvasZoom] = useState(1);

  // Clear selection when spread changes
  useEffect(() => { setSelectedPlaceholder(null); }, [activeSpreadIndex]);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 3500);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'biblioteca':
        return <Biblioteca />;
      case 'exportacao':
        return <Exportacao />;
      case 'layout_designer':
        return <LayoutDesigner />;
      case 'editor':
      default:
        return (
          <>
            <div className="flex-1 flex flex-col min-w-0 relative h-full">
              <Canvas
                selectedPlaceholder={selectedPlaceholder}
                onSelectPlaceholder={setSelectedPlaceholder}
                canvasZoom={canvasZoom}
                setCanvasZoom={setCanvasZoom}
              />
              
              <SpreadNavigator />
              <Filmstrip />
            </div>
            <Inspector
              selectedPlaceholder={selectedPlaceholder}
            />
          </>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-surface">
      <TopNavBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {renderContent()}
      </div>

      {/* Global Toast */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border border-outline-variant/20 bg-surface-container-high backdrop-blur-xl pointer-events-none`}
          style={{ minWidth: 260 }}
        >
          <span className={`material-symbols-outlined text-xl ${TOAST_COLORS[toast.type] || 'text-on-surface-variant'}`}>
            {TOAST_ICONS[toast.type] || 'info'}
          </span>
          <span className="text-on-surface text-sm font-medium whitespace-nowrap">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;

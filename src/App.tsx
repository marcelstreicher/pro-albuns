import React from 'react';
import TopNavBar from './components/TopNavBar';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Filmstrip from './components/Filmstrip';
import Inspector from './components/Inspector';
import Biblioteca from './components/Biblioteca';
import Exportacao from './components/Exportacao';
import Dashboard from './components/Dashboard';
import LayoutDesigner from './components/LayoutDesigner';
import { useProjectStore } from './store/useProjectStore';

const App: React.FC = () => {
  const { currentView } = useProjectStore();

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
            <div className="flex-1 flex flex-col min-w-0">
              <Canvas />
              <Filmstrip />
            </div>
            <Inspector />
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
    </div>
  );
}

export default App;

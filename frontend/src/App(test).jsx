import { useState } from 'react'

import Sidebar from './components/Sidebar';
import MasterDataForm from './components/MasterDataForm';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import ProductionManagement from './components/ProductionManagement'
import BomManagement from './components/BomManagement';

function App() {
  // 🌟 2. 처음 켰을 때 제일 먼저 보이도록 기본값을 '대시보드'로 변경해 줍니다.
  const [activeMenu, setActiveMenu] = useState('BOM 관리'); 

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      <div className="flex-1 p-10 overflow-y-auto">
        
        {/* 🌟 3. '대시보드' 메뉴일 때 Dashboard 컴포넌트를 보여줍니다! */}
        {activeMenu === '대시보드' && <Dashboard />}
        {activeMenu === '기준정보 관리' && <MasterDataForm />}
        {activeMenu === '생산 관리' && <ProductionManagement />}
        {activeMenu === '재고 관리' && <Inventory />}
        {activeMenu === '발주 및 납품' && <KanbanBoard />}
        {activeMenu === 'BOM 관리' && <BomManagement />} 
        
        {/* 아직 안 만든 메뉴들 */}
        {activeMenu !== '대시보드' && activeMenu !== '기준정보 관리' && activeMenu !== '생산 관리' && activeMenu !== '재고 관리' && activeMenu !== '발주 및 납품' &&activeMenu !== 'BOM 관리' && 
        (
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-4xl font-bold text-gray-300 mb-4">{activeMenu}</h1>
            <p className="text-gray-500 text-lg">🚀 현재 화면을 열심히 개발 중입니다...</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
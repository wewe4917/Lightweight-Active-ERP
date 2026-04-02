import { useState } from 'react'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import MasterDataForm from './components/MasterDataForm';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import ProductionManagement from './components/ProductionManagement'
import BomManagement from './components/BomManagement';

function App() {
  return (
    // 🌟 2. 전체 앱을 BrowserRouter로 감싸줍니다. (라우터 마법 시작)
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        
        {/* 더 이상 useState를 넘겨주지 않아도 됩니다! Sidebar가 알아서 주소 보고 움직임 */}
        <Sidebar /> 

        <div className="flex-1 p-10 overflow-y-auto">
          {/* 🌟 3. Routes 안에 각 주소(path)에 맞는 컴포넌트(element)를 짝지어 줍니다. */}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/master-data" element={<MasterDataForm />} />
            <Route path="/production" element={<ProductionManagement />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/orders" element={<KanbanBoard />} />
            <Route path="/bom" element={<BomManagement />} />
            
            {/* 사용자가 이상한 주소로 들어오면 무조건 메인(대시보드)으로 튕겨냅니다 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        
      </div>
    </BrowserRouter>
  );
}

export default App;
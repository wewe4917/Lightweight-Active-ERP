import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MasterDataForm from './components/MasterDataForm';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import ProductionManagement from './components/ProductionManagement';
import BomManagement from './components/BomManagement';
import Login from './components/Login';
import AuditLogPage from './components/AuditLog';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem('access_token')
  );

  const handleLogin = () => setIsLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        <Sidebar onLogout={handleLogout} />
        <div className="flex-1 p-10 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/master-data" element={<MasterDataForm />} />
            <Route path="/production" element={<ProductionManagement />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/orders" element={<KanbanBoard />} />
            <Route path="/bom" element={<BomManagement />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/auditlog" element={<AuditLogPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
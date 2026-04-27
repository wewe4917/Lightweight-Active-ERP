import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar({ onLogout }) {
  const location = useLocation();
  const username = localStorage.getItem('username') || '사용자';

  const menuList = [
    { name: '대시보드',    path: '/' },
    { name: '기준정보 관리', path: '/master-data' },
    { name: '생산 관리',   path: '/production' },
    { name: '재고 관리',   path: '/inventory' },
    { name: '발주 및 납품', path: '/orders' },
    { name: 'BOM 관리',   path: '/bom' },
    { name: '감사 로그', path: '/auditlog' },
  ];

  return (
    <div className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col transition-all duration-300">

      {/* 로고 */}
      <div className="p-6 text-2xl font-bold border-b border-slate-700">
        Potato ERP
      </div>

      {/* 메뉴 */}
      <nav className="flex-col flex gap-2 p-4 mt-4 flex-1">
        {menuList.map((menu) => {
          const isActive = location.pathname === menu.path;
          return (
            <Link
              key={menu.name}
              to={menu.path}
              className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 block ${
                isActive ? 'bg-slate-700 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {menu.name}
            </Link>
          );
        })}
      </nav>

      {/* 하단 유저 정보 + 로그아웃 */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{username}</p>
            <p className="text-xs text-slate-400">로그인 중</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-2 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white text-sm font-bold transition-colors"
        >
          로그아웃
        </button>
      </div>

    </div>
  );
}

export default Sidebar;
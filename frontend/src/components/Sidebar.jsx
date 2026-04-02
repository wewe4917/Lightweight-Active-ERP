import React from 'react';
// 🌟 1. 페이지 이동을 위한 Link와, 현재 주소를 확인하는 useLocation을 불러옵니다!
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation(); // 현재 URL이 뭔지 파악하는 기능

  // 🌟 2. 메뉴 이름에 각각의 인터넷 주소(path)를 짝지어 줍니다.
  const menuList = [
    { name: '대시보드', path: '/' },
    { name: '기준정보 관리', path: '/master-data' },
    { name: '생산 관리', path: '/production' },
    { name: '재고 관리', path: '/inventory' },
    { name: '발주 및 납품', path: '/orders' },
    { name: 'BOM 관리', path: '/bom' }
  ];

  return (
    <div className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col transition-all duration-300">
      <div className="p-6 text-2xl font-bold border-b border-slate-700">Potato ERP</div>
      <nav className="flex-col flex gap-2 p-4 mt-4">
        {menuList.map((menu) => {
          // 🌟 3. 현재 주소(location.pathname)와 메뉴의 주소가 같으면 불을 켭니다!
          const isActive = location.pathname === menu.path;
          
          return (
            <Link
              key={menu.name}
              to={menu.path} // 클릭하면 이 주소로 이동!
              className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 block ${
                isActive ? 'bg-slate-700 font-bold text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {menu.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}



export default Sidebar;
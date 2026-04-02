import React, { useState } from 'react';

function Inventory() {
  // 🌟 1. 백엔드에서 받아온 가상의 재고 데이터 배열
  const [inventoryList, setInventoryList] = useState([
    { id: 1, sku: 'RAW-BOLT-M10', name: '6각볼트 M10', category: '원자재', stock: 850, safeStock: 1000 },
    { id: 2, sku: 'RAW-STEEL-001', name: '냉연강판 2.0t', category: '원자재', stock: 320, safeStock: 200 },
    { id: 3, sku: 'FIN-BRACKET-A', name: '서스펜션 브래킷 A', category: '완제품', stock: 45, safeStock: 50 },
    { id: 4, sku: 'PRD-0999', name: '고강도 볼베어링 C형', category: '부자재', stock: 1200, safeStock: 500 },
  ]);

  // 🌟 2. 팝업창(Modal)을 띄우고 닫기 위한 스위치 & 선택된 데이터 기억하기
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState(0);

  // '수정' 버튼을 눌렀을 때 팝업창 여는 함수
  const openModal = (item) => {
    setSelectedItem(item);
    setEditQuantity(item.stock); // 현재 재고량을 수정 팝업의 기본값으로 세팅
    setIsModalOpen(true);
  };

  // '저장' 버튼을 눌렀을 때 재고 업데이트하는 함수
  const handleSave = () => {
    const updatedList = inventoryList.map(item => 
      item.id === selectedItem.id ? { ...item, stock: editQuantity } : item
    );
    setInventoryList(updatedList); // 리액트 화면 업데이트!
    setIsModalOpen(false); // 팝업 닫기
    alert(`[${selectedItem.name}] 재고가 ${editQuantity}개로 수정되었습니다!`);
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">실시간 재고 현황</h1>

      {/* 📊 재고 리스트 표 (Table) 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-bold">품번 (SKU)</th>
              <th className="p-4 font-bold">품목명</th>
              <th className="p-4 font-bold">카테고리</th>
              <th className="p-4 font-bold">현재 재고</th>
              <th className="p-4 font-bold text-center">상태</th>
              <th className="p-4 font-bold text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inventoryList.map((item) => {
              // 안전 재고보다 현재 재고가 적으면 '부족', 아니면 '정상'
              const isShortage = item.stock < item.safeStock; 
              
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-gray-500 font-medium">{item.sku}</td>
                  <td className="p-4 font-bold text-gray-800">{item.name}</td>
                  <td className="p-4 text-gray-600">{item.category}</td>
                  <td className="p-4 font-bold text-slate-700">{item.stock} <span className="text-sm font-normal text-gray-400">/ {item.safeStock}</span></td>
                  <td className="p-4 text-center">
                    {/* 상태에 따라 뱃지 색상 다르게 보여주기! */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isShortage ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {isShortage ? '재고 부족' : '정상'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => openModal(item)} className="px-4 py-1.5 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-bold transition-colors">
                      수정
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🚨 팝업창 (Modal) 영역: isModalOpen이 true일 때만 화면에 나타납니다! */}
      {isModalOpen && (
        // 배경을 까맣게 덮는 막 (Overlay)
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          
          {/* 하얀색 팝업 박스 */}
          <div className="bg-white p-8 rounded-xl shadow-lg w-[400px]">
            <h2 className="text-xl font-bold text-gray-800 mb-6">재고 수량 수정</h2>
            
            <div className="flex flex-col gap-4 mb-8">
              {/* 읽기 전용 정보 (회색 박스 처리) */}
              <div>
                <label className="text-sm font-bold text-gray-500 block mb-1">선택된 품목</label>
                <div className="bg-gray-100 p-3 rounded-md text-gray-700 font-medium">
                  [{selectedItem.sku}] {selectedItem.name}
                </div>
              </div>

              {/* 직관적인 수량 조절 컨트롤러 */}
              <div>
                <label className="text-sm font-bold text-gray-500 block mb-1">조절할 수량</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditQuantity(editQuantity - 1)} className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xl transition-colors">-</button>
                  <input 
                    type="number" 
                    value={editQuantity} 
                    onChange={(e) => setEditQuantity(Number(e.target.value))}
                    className="flex-1 h-10 border border-gray-300 rounded-lg text-center font-bold text-lg text-gray-800 outline-none focus:border-blue-500" 
                  />
                  <button onClick={() => setEditQuantity(editQuantity + 1)} className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xl transition-colors">+</button>
                </div>
              </div>
            </div>

            {/* 팝업 하단 액션 버튼 */}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-md transition-colors">
                취소
              </button>
              <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors">
                저장하기
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
}

export default Inventory;
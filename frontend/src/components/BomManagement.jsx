import React, { useState, useEffect } from 'react';
import api from '../api';

function BomManagement() {
  const [bomList, setBomList] = useState([]);
  const [finishedItems, setFinishedItems] = useState([]);
  const [rawItems, setRawItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newMaterial, setNewMaterial] = useState({ material_id: '', quantity: 1 });

  const fetchBomList = () => {
    api.get('/api/production/bom/').then(res => setBomList(res.data));
  };

  useEffect(() => {
    fetchBomList();
    api.get('/api/production/items/finished/').then(res => setFinishedItems(res.data));
    api.get('/api/production/items/raw/').then(res => setRawItems(res.data));
  }, []);

  const handleAddMaterial = () => {
    if (!selectedProduct || !newMaterial.material_id || newMaterial.quantity <= 0) {
      alert('완제품과 자재를 선택하고 수량을 입력하세요');
      return;
    }
    api.post('/api/production/bom/create/', {
      product_id: selectedProduct.product_id,
      material_id: newMaterial.material_id,
      quantity: newMaterial.quantity,
    })
      .then(() => {
        alert('BOM 등록 완료');
        setNewMaterial({ material_id: '', quantity: 1 });
        fetchBomList();
      })
      .catch(err => alert(err.response?.data?.error || '오류 발생'));
  };

  const handleDeleteMaterial = (bomId) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    api.delete(`/api/production/bom/${bomId}/`)
      .then(() => fetchBomList())
      .catch(err => alert('삭제 실패'));
  };

  const selectedBom = bomList.find(b => b.product_id === selectedProduct?.product_id);

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-3xl font-bold text-gray-800">BOM (자재명세서) 관리</h1>
      </div>

      <div className="flex gap-6 h-[calc(100vh-160px)]">

        {/* 좌측: BOM 목록 */}
        <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-6">등록된 BOM 목록</h2>
          <div className="flex flex-col gap-2">
            {bomList.map(bom => (
              <div
                key={bom.product_id}
                onClick={() => setSelectedProduct(bom)}
                className={`p-4 rounded-lg cursor-pointer border transition-colors ${
                  selectedProduct?.product_id === bom.product_id
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                }`}
              >
                <p className={`font-bold ${selectedProduct?.product_id === bom.product_id ? 'text-blue-700' : 'text-gray-700'}`}>
                  {bom.product_name}
                </p>
                <p className={`text-sm mt-1 ${selectedProduct?.product_id === bom.product_id ? 'text-blue-500' : 'text-gray-500'}`}>
                  투입 자재: {bom.materials.length}건
                </p>
              </div>
            ))}
            {bomList.length === 0 && <p className="text-gray-400 text-sm">등록된 BOM 없음</p>}
          </div>
        </div>

        {/* 우측: BOM 상세 */}
        <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">BOM 상세 설계</h2>

          {/* 완제품 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">생산할 완제품 (Target Product)</label>
            <select
              onChange={(e) => {
                const found = bomList.find(b => b.product_id === Number(e.target.value));
                if (found) {
                  setSelectedProduct(found);
                } else {
                  setSelectedProduct({ product_id: Number(e.target.value), product_name: e.target.options[e.target.selectedIndex].text, materials: [] });
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 outline-none focus:border-blue-500 bg-gray-50"
            >
              <option value="">완제품 선택</option>
              {finishedItems.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          {/* 현재 등록된 자재 목록 */}
          {selectedProduct && (
            <>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-bold text-gray-700">소요 자재 구성 (Materials)</label>
              </div>
              <div className="flex flex-col gap-3 mb-6 flex-1 overflow-y-auto">
                {selectedBom?.materials.map((material, index) => (
                  <div key={material.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <span className="w-6 text-center font-bold text-gray-400">{index + 1}</span>
                    <span className="flex-1 text-gray-800 font-medium">{material.material_name}</span>
                    <span className="w-24 text-right font-bold text-gray-700">{material.quantity}</span>
                    <span className="w-16 text-center text-gray-500">{material.unit}</span>
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md font-bold text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(!selectedBom || selectedBom.materials.length === 0) && (
                  <p className="text-gray-400 text-sm">등록된 자재 없음</p>
                )}
              </div>

              {/* 새 자재 추가 */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-bold text-gray-700 mb-3">+ 새 자재 추가</p>
                <div className="flex gap-3 items-center">
                  <select
                    value={newMaterial.material_id}
                    onChange={(e) => setNewMaterial({ ...newMaterial, material_id: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">자재 선택</option>
                    {rawItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newMaterial.quantity}
                    onChange={(e) => setNewMaterial({ ...newMaterial, quantity: Number(e.target.value) })}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddMaterial}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700"
                  >
                    추가
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default BomManagement;
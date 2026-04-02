import React, { useState } from 'react';

function BomManagement() {
  // 🌟 1. 생산할 완제품 이름 상태
  const [targetProduct, setTargetProduct] = useState('서스펜션 브래킷 A');

  // 🌟 2. 투입될 자재들의 목록 (초기값으로 2개를 넣어두었습니다)
  const [materials, setMaterials] = useState([
    { id: 1, name: '냉연강판 2.0t', quantity: 1, unit: '장' },
    { id: 2, name: '6각볼트 M10', quantity: 4, unit: '개' },
  ]);

  // 🌟 3. [+ 새 자재 추가] 버튼을 누를 때 실행될 함수
  const handleAddMaterial = () => {
    const newMaterial = {
      id: Date.now(), // 겹치지 않는 고유 ID 생성
      name: '',
      quantity: 1,
      unit: '개',
    };
    setMaterials([...materials, newMaterial]); // 기존 배열에 새 자재 추가!
  };

  // 🌟 4. 특정 자재를 삭제하는 함수
  const handleRemoveMaterial = (idToRemove) => {
    // 삭제할 ID와 다른 것들만 남겨서 배열을 새로 만듭니다 (filter)
    setMaterials(materials.filter(material => material.id !== idToRemove));
  };

  // 🌟 5. 자재 입력칸에 글씨를 쓸 때마다 배열 데이터를 업데이트하는 함수
  const handleMaterialChange = (id, field, value) => {
    const updatedMaterials = materials.map(material =>
      material.id === id ? { ...material, [field]: value } : material
    );
    setMaterials(updatedMaterials);
  };

  // 🌟 6. 최종 저장 버튼
  const handleSubmit = () => {
    const bomData = {
      product: targetProduct,
      materials: materials
    };
    alert("🎉 BOM 데이터가 성공적으로 완성되었습니다!\n\n" + JSON.stringify(bomData, null, 2));
  };

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-3xl font-bold text-gray-800">BOM (자재명세서) 관리</h1>
      </div>

      <div className="flex gap-6 h-[calc(100vh-160px)]">
        
        {/* 좌측: 등록된 BOM 리스트 (참고용) */}
        <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-6">등록된 BOM 목록</h2>
          <div className="flex flex-col gap-2">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer">
              <p className="font-bold text-blue-700">서스펜션 브래킷 A</p>
              <p className="text-sm text-blue-500 mt-1">투입 자재: 2건</p>
            </div>
            <div className="p-4 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors">
              <p className="font-bold text-gray-700">고강도 볼베어링 C형</p>
              <p className="text-sm text-gray-500 mt-1">투입 자재: 5건</p>
            </div>
            <div className="p-4 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors">
              <p className="font-bold text-gray-700">산업용 모터 하우징</p>
              <p className="text-sm text-gray-500 mt-1">투입 자재: 12건</p>
            </div>
          </div>
        </div>

        {/* 우측: BOM 상세 설계 폼 */}
        <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col relative">
          <h2 className="text-lg font-bold text-gray-800 mb-6">BOM 상세 설계</h2>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {/* 1. 대상 품목 선택 */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-700 mb-2">생산할 완제품 (Target Product)</label>
              <input 
                type="text" 
                value={targetProduct}
                onChange={(e) => setTargetProduct(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 font-bold outline-none focus:border-blue-500 bg-gray-50" 
              />
            </div>

            {/* 2. 투입 자재 목록 (Dynamic List) */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-bold text-gray-700">소요 자재 구성 (Materials)</label>
                {/* 🌟 마법의 자재 추가 버튼! */}
                <button onClick={handleAddMaterial} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-md">
                  + 새 자재 추가
                </button>
              </div>

              {/* 자재 리스트 출력 영역 */}
              <div className="flex flex-col gap-3">
                {materials.map((material, index) => (
                  <div key={material.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <span className="w-6 text-center font-bold text-gray-400">{index + 1}</span>
                    
                    {/* 자재명 입력 */}
                    <input 
                      type="text" 
                      placeholder="자재명 검색 또는 입력"
                      value={material.name}
                      onChange={(e) => handleMaterialChange(material.id, 'name', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    
                    {/* 수량 입력 */}
                    <input 
                      type="number" 
                      value={material.quantity}
                      onChange={(e) => handleMaterialChange(material.id, 'quantity', Number(e.target.value))}
                      className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm text-right outline-none focus:border-blue-500"
                    />
                    
                    {/* 단위 입력 */}
                    <input 
                      type="text" 
                      value={material.unit}
                      onChange={(e) => handleMaterialChange(material.id, 'unit', e.target.value)}
                      className="w-16 border border-gray-300 rounded-md px-3 py-2 text-sm text-center outline-none focus:border-blue-500"
                    />
                    
                    {/* 삭제 버튼 */}
                    <button onClick={() => handleRemoveMaterial(material.id)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors font-bold text-lg">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 하단 저장 버튼 */}
          <div className="mt-8 border-t border-gray-100 pt-6 flex justify-end">
            <button onClick={handleSubmit} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-sm">
              BOM 저장하기
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

export default BomManagement;
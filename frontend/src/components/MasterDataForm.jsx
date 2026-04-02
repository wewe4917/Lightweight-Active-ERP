import React, { useState } from 'react';

function MasterDataForm() {
  // 폼에 관련된 상태와 함수들을 모조리 이쪽으로 이사시켰습니다!
  const [formData, setFormData] = useState({
    itemName: '고강도 볼베어링 C형',
    sku: 'PRD-0999',
    category: '',
    safeStock: 0,
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = () => {
    alert("🎉 성공적으로 데이터를 모았습니다!\n\n" + JSON.stringify(formData, null, 2));
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">신규 품목 및 라인 등록</h1>
      <div className="flex gap-6 min-h-[600px]">
        
        {/* 좌측 리스트 */}
        <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-6">등록 품목 리스트</h2>
          <div className="text-blue-600 font-medium cursor-pointer">고강도 볼베어링 A형</div>
        </div>

        {/* 우측 폼 영역 */}
        <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">기본 정보 입력</h2>
          <div className="flex flex-col gap-5 flex-1">
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">품목명</label>
              <input name="itemName" value={formData.itemName} onChange={handleInputChange} type="text" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">품번 (SKU)</label>
              <input name="sku" value={formData.sku} onChange={handleInputChange} type="text" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">카테고리</label>
              <select name="category" value={formData.category} onChange={handleInputChange} className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 appearance-none bg-white">
                <option value="">선택하세요 ▼</option>
                <option value="원자재">원자재</option>
                <option value="부자재">부자재</option>
                <option value="완제품">완제품</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">안전 재고 수량</label>
              <input name="safeStock" value={formData.safeStock} onChange={handleInputChange} type="number" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-start gap-4">
              <label className="w-32 font-bold text-gray-700 mt-2">품목 상세 설명</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 resize-none"></textarea>
            </div>
            <div className="flex items-start gap-4 mt-2">
              <label className="w-32 font-bold text-gray-700 mt-2">품목 이미지 첨부</label>
              <div className="flex-1 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 h-32 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                <span className="text-gray-500 font-medium">클릭하거나 이미지를 드래그하여 업로드</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
            <button className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md font-medium hover:bg-gray-50">초기화</button>
            <button onClick={handleSubmit} className="px-6 py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-900">등록하기</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default MasterDataForm;
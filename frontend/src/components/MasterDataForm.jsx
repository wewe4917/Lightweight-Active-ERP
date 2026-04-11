import React, { useState, useEffect } from 'react'; // 🚀 useEffect 추가
import axios from 'axios';

function MasterDataForm() {
  // 폼 입력용 State
  const [formData, setFormData] = useState({
    code: 'PRD-1000',
    name: '',
    unit: 'EA',
    item_type: 'raw',
    safety_stock: 0,
    current_stock: 0,
    unit_price: 0,
    description: ''
  });

  // 🚀 1. 백엔드에서 가져온 목록을 담을 새로운 State
  const [itemList, setItemList] = useState([]);

  // 🚀 2. 백엔드(Django)에서 아이템 목록을 가져오는 함수
  const fetchItems = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/inventory/items/');
      setItemList(response.data); // 가져온 데이터를 State에 저장!
    } catch (error) {
      console.error("목록 불러오기 실패:", error);
    }
  };

  // 🚀 3. 화면이 처음 렌더링될 때 딱 한 번 fetchItems 실행
  useEffect(() => {
    fetchItems();
  }, []);

  const handleSelectItem = (item) => {
    // 백엔드에서 한글('원자재')로 넘어오는 값을 select 태그가 인식하도록 영어로 변환
    const typeMap = {
      '원자재': 'raw',
      '반제품': 'semi',
      '완제품': 'finished'
    };

    setFormData({
      code: item.code || '',
      name: item.name || '',
      unit: item.unit || 'EA',
      item_type: typeMap[item.item_type] || item.item_type || 'raw',
      safety_stock: item.safety_stock || 0,
      current_stock: item.current_stock || 0,
      unit_price: item.unit_price || 0,
      description: item.description || '' // 주의: 백엔드 목록 API에 설명이 없다면 빈칸으로 나옵니다!
    });
  };

  // 🚀 2. 덤으로 '초기화' 버튼용 함수도 만듭니다 (새로 등록하고 싶을 때 폼 비우기)
  const handleReset = () => {
    setFormData({
      code: '', name: '', unit: 'EA', item_type: 'raw', 
      safety_stock: 0, current_stock: 0, unit_price: 0, description: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/inventory/items/', formData);
      if (response.status === 201 || response.status === 200) {
        alert("✅ 백엔드 DB에 성공적으로 등록되었습니다!");
        fetchItems(); // 🚀 4. 등록 성공하면 목록 다시 새로고침!
      }
    } catch (error) {
      console.error("❌ 등록 실패:", error);
      alert("등록 중 에러가 발생했습니다. 터미널의 빨간 글씨를 확인해주세요!");
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">신규 품목 및 라인 등록</h1>
      <div className="flex gap-6 min-h-[600px]">
        
        {/* 좌측 리스트 */}
        <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-6">등록 품목 리스트</h2>
          
          {/* 🚀 5. 가져온 데이터를 map() 함수로 화면에 뿌려주기 */}
          <div className="flex flex-col gap-3">
            {itemList.map((item) => (
              <div key={item.id} 
              onClick={() => handleSelectItem(item)}
              className="text-blue-600 font-medium cursor-pointer hover:underline">
                [{item.code}] {item.name}
              </div>
            ))}
            
            {/* 데이터가 하나도 없을 때 보여줄 문구 */}
            {itemList.length === 0 && (
              <div className="text-gray-400 text-sm">등록된 품목이 없습니다.</div>
            )}
          </div>
        </div>

        {/* 우측 폼 영역 (이전과 동일) */}
        <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">기본 정보 입력</h2>
          <div className="flex flex-col gap-5 flex-1">
            
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">품목명</label>
              <input name="name" value={formData.name} onChange={handleInputChange} type="text" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">품번 (코드)</label>
              <input name="code" value={formData.code} onChange={handleInputChange} type="text" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>

            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">단위</label>
              <input name="unit" value={formData.unit} onChange={handleInputChange} type="text" placeholder="예: EA, kg, L" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>

            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">카테고리</label>
              <select name="item_type" value={formData.item_type} onChange={handleInputChange} className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 appearance-none bg-white">
                <option value="raw">원자재</option>
                <option value="semi">반제품</option>
                <option value="finished">완제품</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">단가</label>
              <input name="unit_price" value={formData.unit_price} onChange={handleInputChange} type="number" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700 text-blue-600">현재 재고 수량</label>
              <input name="current_stock" value={formData.current_stock} onChange={handleInputChange} type="number" className="flex-1 border border-blue-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">안전 재고 수량</label>
              <input name="safety_stock" value={formData.safety_stock} onChange={handleInputChange} type="number" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            
            <div className="flex items-start gap-4">
              <label className="w-32 font-bold text-gray-700 mt-2">품목 상세 설명</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 resize-none"></textarea>
            </div>

          </div>
          <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
            <button onClick={handleReset} className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md font-medium hover:bg-gray-50">초기화</button>
            <button onClick={handleSubmit} className="px-6 py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-900">등록하기</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default MasterDataForm;
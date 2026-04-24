import React, { useState, useEffect } from 'react';
import api from '../api';

function MasterDataForm() {
  const [itemList, setItemList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    item_type: '',
    unit: 'EA',
    safety_stock: 0,
    unit_price: 0,
    description: '',
  });

  const fetchItems = () => {
    api.get('/api/inventory/items/').then(res => setItemList(res.data));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    api.get(`/api/inventory/items/${item.id}/`).then(res => {
      setFormData({
        name:         res.data.name,
        code:         res.data.code,
        item_type:    res.data.item_type,
        unit:         res.data.unit,
        safety_stock: res.data.safety_stock,
        unit_price:   res.data.unit_price,
        description:  res.data.description,
      });
    });
  };

  const handleReset = () => {
    setSelectedItem(null);
    setFormData({ name: '', code: '', item_type: '', unit: 'EA', safety_stock: 0, unit_price: 0, description: '' });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code || !formData.item_type) {
      alert('품목명, 품번, 카테고리는 필수입니다');
      return;
    }

    if (selectedItem) {
      // 수정
      api.put(`/api/inventory/items/${selectedItem.id}/`, formData)
        .then(res => {
          alert(`✅ ${res.data.message}`);
          fetchItems();
        })
        .catch(err => alert(err.response?.data?.error || '오류 발생'));
    } else {
      // 신규 등록
      api.post('/api/inventory/items/create/', formData)
        .then(res => {
          alert(`✅ ${res.data.message}`);
          handleReset();
          fetchItems();
        })
        .catch(err => alert(err.response?.data?.error || '오류 발생'));
    }
  };

  const getCategoryLabel = (type) => {
    switch(type) {
      case 'raw':      return '원자재';
      case 'semi':     return '반제품';
      case 'finished': return '완제품';
      default:         return type;
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">신규 품목 및 라인 등록</h1>
      <div className="flex gap-6 min-h-[600px]">

        {/* 좌측 리스트 */}
        <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-6">등록 품목 리스트</h2>
          {/* 이 버튼 추가 */}
<button
  onClick={handleReset}
  className="w-full mb-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-md hover:bg-slate-900"
>
  + 새 품목 등록
</button>
          <div className="flex flex-col gap-2">
            {itemList.map(item => (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedItem?.id === item.id
                    ? 'text-blue-600 font-bold bg-blue-50'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-gray-400">{item.code} · {getCategoryLabel(item.item_type)}</p>
              </div>
            ))}
            {itemList.length === 0 && <p className="text-gray-400 text-sm">등록된 품목 없음</p>}
          </div>
        </div>

        {/* 우측 폼 */}
        <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">
            {selectedItem ? `${selectedItem.name} 수정` : '기본 정보 입력'}
          </h2>
          <div className="flex flex-col gap-5 flex-1">
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">품목명</label>
              <input name="name" value={formData.name} onChange={handleInputChange} type="text"
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">품번 (SKU)</label>
              <input name="code" value={formData.code} onChange={handleInputChange} type="text"
                disabled={!!selectedItem}
                className={`flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 ${selectedItem ? 'bg-gray-100' : ''}`} />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">단위</label>
              <input name="unit" value={formData.unit} onChange={handleInputChange} type="text"
                placeholder="EA, kg, L ..."
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">카테고리</label>
              <select name="item_type" value={formData.item_type} onChange={handleInputChange}
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 bg-white">
                <option value="">선택하세요</option>
                <option value="raw">원자재</option>
                <option value="semi">반제품</option>
                <option value="finished">완제품</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">안전 재고 수량</label>
              <input name="safety_stock" value={formData.safety_stock} onChange={handleInputChange} type="number"
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-32 font-bold text-gray-700">단가</label>
              <input name="unit_price" value={formData.unit_price} onChange={handleInputChange} type="number"
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500" />
            </div>
            <div className="flex items-start gap-4">
              <label className="w-32 font-bold text-gray-700 mt-2">품목 상세 설명</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3"
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 resize-none"></textarea>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
            <button onClick={handleReset}
              className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md font-medium hover:bg-gray-50">
              초기화
            </button>
            <button onClick={handleSubmit}
              className="px-6 py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-900">
              {selectedItem ? '수정하기' : '등록하기'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default MasterDataForm;
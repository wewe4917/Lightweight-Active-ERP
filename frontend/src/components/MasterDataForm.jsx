import React, { useState, useEffect } from 'react';
import api from '../api';

function MasterDataForm() {
  const [activeTab, setActiveTab] = useState('item');

  // ── 품목 상태 ──────────────────────────────────────
  const [itemList, setItemList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '', code: '', item_type: '', unit: 'EA',
    safety_stock: 0, unit_price: 0, description: '',
  });

  // ── 거래처 상태 ────────────────────────────────────
  const [partnerList, setPartnerList] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '', code: '', partner_type: '',
    contact_name: '', phone: '', email: '',
  });

  const fetchItems = () => {
    api.get('/api/inventory/items/').then(res => setItemList(res.data));
  };

  const fetchPartners = () => {
    api.get('/api/inventory/partners/').then(res => setPartnerList(res.data));
  };

  useEffect(() => {
    fetchItems();
    fetchPartners();
  }, []);

  // ── 품목 핸들러 ────────────────────────────────────
  const handleItemChange = (e) => {
    setItemForm({ ...itemForm, [e.target.name]: e.target.value });
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    api.get(`/api/inventory/items/${item.id}/`).then(res => {
      setItemForm({
        name: res.data.name, code: res.data.code,
        item_type: res.data.item_type, unit: res.data.unit,
        safety_stock: res.data.safety_stock, unit_price: res.data.unit_price,
        description: res.data.description,
      });
    });
  };

  const handleItemReset = () => {
    setSelectedItem(null);
    setItemForm({ name: '', code: '', item_type: '', unit: 'EA', safety_stock: 0, unit_price: 0, description: '' });
  };

  const handleItemSubmit = () => {
    if (!itemForm.name || !itemForm.code || !itemForm.item_type) {
      alert('품목명, 품번, 카테고리는 필수입니다');
      return;
    }
    if (selectedItem) {
      api.put(`/api/inventory/items/${selectedItem.id}/`, itemForm)
        .then(res => { alert(`✅ ${res.data.message}`); fetchItems(); })
        .catch(err => alert(err.response?.data?.error || '오류 발생'));
    } else {
      api.post('/api/inventory/items/create/', itemForm)
        .then(res => { alert(`✅ ${res.data.message}`); handleItemReset(); fetchItems(); })
        .catch(err => alert(err.response?.data?.error || '오류 발생'));
    }
  };

  const handleItemDelete = () => {
    if (!selectedItem) return;
    if (!window.confirm(`"${selectedItem.name}" 품목을 삭제하시겠습니까?\n연결된 재고/BOM 데이터도 함께 삭제될 수 있습니다.`)) return;
    api.delete(`/api/inventory/items/${selectedItem.id}/delete/`)
      .then(() => { alert('삭제 완료'); handleItemReset(); fetchItems(); })
      .catch(err => alert(err.response?.data?.error || '삭제 실패'));
  };

  // ── 거래처 핸들러 ──────────────────────────────────
  const handlePartnerChange = (e) => {
    setPartnerForm({ ...partnerForm, [e.target.name]: e.target.value });
  };

  const handleSelectPartner = (partner) => {
    setSelectedPartner(partner);
    setPartnerForm({
      name: partner.name, code: partner.code,
      partner_type: partner.partner_type,
      contact_name: partner.contact_name || '',
      phone: partner.phone || '',
      email: partner.email || '',
    });
  };

  const handlePartnerReset = () => {
    setSelectedPartner(null);
    setPartnerForm({ name: '', code: '', partner_type: '', contact_name: '', phone: '', email: '' });
  };

  const handlePartnerSubmit = () => {
    if (!partnerForm.name || !partnerForm.code || !partnerForm.partner_type) {
      alert('거래처명, 코드, 유형은 필수입니다');
      return;
    }
    api.post('/api/inventory/partners/create/', partnerForm)
      .then(res => { alert(`✅ ${res.data.message}`); handlePartnerReset(); fetchPartners(); })
      .catch(err => alert(err.response?.data?.error || '오류 발생'));
  };

  const handlePartnerDelete = () => {
    if (!selectedPartner) return;
    if (!window.confirm(`"${selectedPartner.name}" 거래처를 삭제하시겠습니까?`)) return;
    api.delete(`/api/inventory/partners/${selectedPartner.id}/delete/`)
      .then(() => { alert('삭제 완료'); handlePartnerReset(); fetchPartners(); })
      .catch(err => alert(err.response?.data?.error || '삭제 실패'));
  };

  const getCategoryLabel = (type) => {
    switch(type) {
      case 'raw':      return '원자재';
      case 'semi':     return '반제품';
      case 'finished': return '완제품';
      default:         return type;
    }
  };

  const getPartnerTypeLabel = (type) => {
    switch(type) {
      case 'supplier': return '공급업체';
      case 'customer': return '납품처';
      case 'both':     return '양방향';
      default:         return type;
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">기준정보 관리</h1>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('item')}
          className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${
            activeTab === 'item'
              ? 'bg-slate-800 text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          품목 관리
        </button>
        <button
          onClick={() => setActiveTab('partner')}
          className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${
            activeTab === 'partner'
              ? 'bg-slate-800 text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          거래처 관리
        </button>
      </div>

      {/* ── 품목 탭 ── */}
      {activeTab === 'item' && (
        <div className="flex gap-6 min-h-[600px]">
          <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4">등록 품목 리스트</h2>
            <button onClick={handleItemReset}
              className="w-full mb-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-md hover:bg-slate-900">
              + 새 품목 등록
            </button>
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {itemList.map(item => (
                <div key={item.id} onClick={() => handleSelectItem(item)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedItem?.id === item.id ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700 hover:bg-slate-50'
                  }`}>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.code} · {getCategoryLabel(item.item_type)}</p>
                </div>
              ))}
              {itemList.length === 0 && <p className="text-gray-400 text-sm">등록된 품목 없음</p>}
            </div>
          </div>

          <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-6">
              {selectedItem ? `${selectedItem.name} 수정` : '품목 정보 입력'}
            </h2>
            <div className="flex flex-col gap-5 flex-1">
              {[
                { label: '품목명', name: 'name', type: 'text' },
                { label: '품번 (SKU)', name: 'code', type: 'text', disabled: !!selectedItem },
                { label: '단위', name: 'unit', type: 'text', placeholder: 'EA, kg, L ...' },
                { label: '안전 재고 수량', name: 'safety_stock', type: 'number' },
                { label: '단가', name: 'unit_price', type: 'number' },
              ].map(field => (
                <div key={field.name} className="flex items-center gap-4">
                  <label className="w-32 font-bold text-gray-700">{field.label}</label>
                  <input
                    name={field.name} type={field.type}
                    value={itemForm[field.name]}
                    onChange={handleItemChange}
                    disabled={field.disabled}
                    placeholder={field.placeholder}
                    className={`flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 ${field.disabled ? 'bg-gray-100' : ''}`}
                  />
                </div>
              ))}
              <div className="flex items-center gap-4">
                <label className="w-32 font-bold text-gray-700">카테고리</label>
                <select name="item_type" value={itemForm.item_type} onChange={handleItemChange}
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 bg-white">
                  <option value="">선택하세요</option>
                  <option value="raw">원자재</option>
                  <option value="semi">반제품</option>
                  <option value="finished">완제품</option>
                </select>
              </div>
              <div className="flex items-start gap-4">
                <label className="w-32 font-bold text-gray-700 mt-2">상세 설명</label>
                <textarea name="description" value={itemForm.description} onChange={handleItemChange} rows="3"
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
              {selectedItem && (
                <button onClick={handleItemDelete}
                  className="px-6 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600">
                  삭제하기
                </button>
              )}
              <button onClick={handleItemReset}
                className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md font-medium hover:bg-gray-50">
                초기화
              </button>
              <button onClick={handleItemSubmit}
                className="px-6 py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-900">
                {selectedItem ? '수정하기' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 거래처 탭 ── */}
      {activeTab === 'partner' && (
        <div className="flex gap-6 min-h-[600px]">
          <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4">등록 거래처 리스트</h2>
            <button onClick={handlePartnerReset}
              className="w-full mb-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-md hover:bg-slate-900">
              + 새 거래처 등록
            </button>
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {partnerList.map(partner => (
                <div key={partner.id} onClick={() => handleSelectPartner(partner)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPartner?.id === partner.id ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700 hover:bg-slate-50'
                  }`}>
                  <p className="font-medium">{partner.name}</p>
                  <p className="text-xs text-gray-400">{partner.code} · {getPartnerTypeLabel(partner.partner_type)}</p>
                </div>
              ))}
              {partnerList.length === 0 && <p className="text-gray-400 text-sm">등록된 거래처 없음</p>}
            </div>
          </div>

          <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-6">
              {selectedPartner ? `${selectedPartner.name} 정보` : '거래처 정보 입력'}
            </h2>
            <div className="flex flex-col gap-5 flex-1">
              {[
                { label: '거래처명', name: 'name', type: 'text' },
                { label: '거래처 코드', name: 'code', type: 'text', disabled: !!selectedPartner },
                { label: '담당자명', name: 'contact_name', type: 'text' },
                { label: '연락처', name: 'phone', type: 'text', placeholder: '010-0000-0000' },
                { label: '이메일', name: 'email', type: 'email' },
              ].map(field => (
                <div key={field.name} className="flex items-center gap-4">
                  <label className="w-32 font-bold text-gray-700">{field.label}</label>
                  <input
                    name={field.name} type={field.type}
                    value={partnerForm[field.name]}
                    onChange={handlePartnerChange}
                    disabled={field.disabled}
                    placeholder={field.placeholder}
                    className={`flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 ${field.disabled ? 'bg-gray-100' : ''}`}
                  />
                </div>
              ))}
              <div className="flex items-center gap-4">
                <label className="w-32 font-bold text-gray-700">거래처 유형</label>
                <select name="partner_type" value={partnerForm.partner_type} onChange={handlePartnerChange}
                  className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-600 outline-none focus:border-blue-500 bg-white">
                  <option value="">선택하세요</option>
                  <option value="supplier">공급업체</option>
                  <option value="customer">납품처</option>
                  <option value="both">양방향</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-6">
              {selectedPartner && (
                <button onClick={handlePartnerDelete}
                  className="px-6 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600">
                  삭제하기
                </button>
              )}
              <button onClick={handlePartnerReset}
                className="px-6 py-2 border border-gray-300 text-gray-600 rounded-md font-medium hover:bg-gray-50">
                초기화
              </button>
              {!selectedPartner && (
                <button onClick={handlePartnerSubmit}
                  className="px-6 py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-900">
                  등록하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MasterDataForm;
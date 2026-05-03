import React, { useState, useEffect } from 'react';
import api from '../api';
import OcrModal from './OcrModal';

// ── 납품지시서 섹션 컴포넌트 ──────────────────────────
function DeliverySection() {
  const [dnList, setDnList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDnList = () => {
    api.get('/api/purchasing/delivery/')
      .then(res => { setDnList(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchDnList(); }, []);

  const handleComplete = (dn) => {
    if (!window.confirm(`${dn.item_name} ${dn.quantity}개 납품 완료 처리하시겠습니까?`)) return;
    api.post(`/api/purchasing/delivery/${dn.id}/complete/`)
      .then(res => {
        alert(`✅ ${res.data.message}\n잔여 재고: ${res.data.current_stock}개`);
        fetchDnList();
      })
      .catch(err => alert(err.response?.data?.error || '오류 발생'));
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':   return 'bg-yellow-100 text-yellow-600';
      case 'delivered': return 'bg-green-100 text-green-600';
      case 'cancelled': return 'bg-red-100 text-red-500';
      default:          return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-h-[400px] overflow-y-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
            <th className="p-4 font-bold">납품지시번호</th>
            <th className="p-4 font-bold">납품처</th>
            <th className="p-4 font-bold">품목</th>
            <th className="p-4 font-bold text-right">수량</th>
            <th className="p-4 font-bold text-center">상태</th>
            <th className="p-4 font-bold text-center">납품일</th>
            <th className="p-4 font-bold text-center">처리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {dnList.length === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-gray-400">등록된 납품지시서 없음</td>
            </tr>
          )}
          {dnList.map(dn => (
            <tr key={dn.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 font-medium text-gray-500">{dn.dn_number}</td>
              <td className="p-4 font-bold text-gray-800">{dn.partner_name}</td>
              <td className="p-4 text-gray-600">{dn.item_name}</td>
              <td className="p-4 font-bold text-slate-700 text-right">{dn.quantity}개</td>
              <td className="p-4 text-center">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(dn.status)}`}>
                  {dn.status_display}
                </span>
              </td>
              <td className="p-4 text-center text-gray-500 text-sm">
                {dn.delivered_date || '-'}
              </td>
              <td className="p-4 text-center">
                {dn.status === 'pending' && (
                  <button
                    onClick={() => handleComplete(dn)}
                    className="px-3 py-1.5 bg-green-50 border border-green-300 text-green-600 hover:bg-green-100 rounded-md text-sm font-bold"
                  >
                    납품완료
                  </button>
                )}
                {dn.status === 'delivered' && (
                  <span className="text-green-500 text-sm font-bold">✅ 완료</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 메인 칸반보드 컴포넌트 ────────────────────────────
function KanbanBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDnModalOpen, setIsDnModalOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [partners, setPartners] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [newOrder, setNewOrder] = useState({
    partner_id: '',
    expected_date: '',
    note: '',
    items: [{ item_id: '', quantity: 1, unit_price: 0 }],
  });
  const [newDn, setNewDn] = useState({
    partner_id: '',
    item_id: '',
    quantity: 1,
  });

  const fetchOrders = () => {
    api.get('/api/purchasing/orders/')
      .then(res => { setOrders(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    api.get('/api/inventory/items/').then(res => setItems(res.data));
    fetch('http://127.0.0.1:8000/api/inventory/partners/')
      .then(r => r.json())
      .then(data => setPartners(data))
      .catch(() => {});
  }, []);

  const getByStatus = (status) => orders.filter(o => o.status === status);

  const handleStatusChange = (poId, newStatus) => {
    api.patch(`/api/purchasing/orders/${poId}/status/`, { status: newStatus })
      .then(() => fetchOrders())
      .catch(err => alert(err.response?.data?.error || '오류 발생'));
  };

  const handleDownloadPdf = (poId) => {
    window.open(`http://127.0.0.1:8000/api/purchasing/orders/${poId}/pdf/`, '_blank');
  };

  const handleAddItem = () => {
    setNewOrder({ ...newOrder, items: [...newOrder.items, { item_id: '', quantity: 1, unit_price: 0 }] });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...newOrder.items];
    updated[index][field] = value;
    setNewOrder({ ...newOrder, items: updated });
  };

  const handleRemoveItem = (index) => {
    setNewOrder({ ...newOrder, items: newOrder.items.filter((_, i) => i !== index) });
  };

  const handleCreateOrder = () => {
    if (!newOrder.partner_id || newOrder.items.length === 0) {
      alert('거래처와 품목을 입력하세요');
      return;
    }
    api.post('/api/purchasing/orders/create/', newOrder)
      .then(res => {
        alert(`✅ ${res.data.po_number} 발주서 생성 완료`);
        setIsModalOpen(false);
        setNewOrder({ partner_id: '', expected_date: '', note: '', items: [{ item_id: '', quantity: 1, unit_price: 0 }] });
        fetchOrders();
      })
      .catch(err => alert(err.response?.data?.error || '오류 발생'));
  };

  const handleCreateDn = () => {
    if (!newDn.partner_id || !newDn.item_id || newDn.quantity <= 0) {
      alert('거래처, 품목, 수량을 입력하세요');
      return;
    }
    api.post('/api/purchasing/delivery/create/', newDn)
      .then(res => {
        alert(`✅ ${res.data.dn_number} 납품지시서 생성 완료`);
        setIsDnModalOpen(false);
        setNewDn({ partner_id: '', item_id: '', quantity: 1 });
      })
      .catch(err => alert(err.response?.data?.error || '오류 발생'));
  };

  const statusColumns = [
    { key: 'draft',     label: '발주 대기',    badge: 'bg-slate-200 text-slate-600', border: 'border-gray-200' },
    { key: 'sent',      label: '상품 준비 중', badge: 'bg-blue-100 text-blue-600',   border: 'border-blue-200' },
    { key: 'received',  label: '입고 완료',    badge: 'bg-green-100 text-green-600', border: 'border-green-200' },
    { key: 'cancelled', label: '취소',         badge: 'bg-red-100 text-red-500',     border: 'border-red-200' },
  ];

  const nextStatus = { draft: 'sent', sent: 'received' };

  if (loading) return <p>로딩 중...</p>;

  return (
    <>
      {/* ── 발주 섹션 ── */}
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-3xl font-bold text-gray-800">발주 현황 보드</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIsOcrOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700"
          >
            📄 납품서 OCR
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-slate-800 text-white font-bold rounded-md hover:bg-slate-900"
          >
            + 신규 발주서 생성
          </button>
        </div>
      </div>

      {/* 칸반 보드 */}
      <div className="flex gap-6 overflow-x-auto pb-4 mb-12" style={{ minHeight: '400px' }}>
        {statusColumns.map(col => (
         <div key={col.key} className="w-72 flex-shrink-0 bg-slate-100 rounded-xl p-4 flex flex-col gap-4 max-h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center px-2 pt-2">
              <h2 className="text-lg font-bold text-gray-700">{col.label}</h2>
              <span className={`text-sm font-bold px-2 py-1 rounded-full ${col.badge}`}>
                {getByStatus(col.key).length}
              </span>
            </div>
            {getByStatus(col.key).map(order => (
              <div key={order.id}
                className={`bg-white p-5 rounded-xl shadow-sm border ${col.border} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setSelectedPo(selectedPo?.id === order.id ? null : order)}
              >
                <p className="text-xs text-gray-400 mb-2 font-medium">{order.po_number}</p>
                <h3 className="font-bold text-gray-800 mb-1">발주처 : {order.partner_name}</h3>
                <p className="text-gray-500 text-sm mb-3">
                  {order.items.length > 0
                    ? `[${order.items[0].item_code}] ${order.items[0].item_name} 외 ${order.items.length - 1}건`
                    : '품목 없음'}
                </p>
                <p className="text-sm font-bold text-slate-700 mb-3">
                  합계: {order.total_amount.toLocaleString()}원
                </p>
                {selectedPo?.id === order.id && (
                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-xs font-bold text-gray-500 mb-2">품목 목록</p>
                    {order.items.map(i => (
                      <p key={i.id} className="text-xs text-gray-600 mb-1">
                        [{i.item_code}] {i.item_name} × {i.quantity}개 ({i.unit_price.toLocaleString()}원)
                      </p>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(order.id); }}
                        className="flex-1 py-1.5 bg-blue-50 border border-blue-300 text-blue-600 text-xs font-bold rounded-md hover:bg-blue-100"
                      >
                        PDF 출력
                      </button>
                      {nextStatus[order.status] && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, nextStatus[order.status]); }}
                          className="flex-1 py-1.5 bg-green-50 border border-green-300 text-green-600 text-xs font-bold rounded-md hover:bg-green-100"
                        >
                          {order.status === 'draft' ? '발송 완료' : '입고 완료'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── 납품지시서 섹션 ── */}
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-gray-800">납품지시서 현황</h2>
        <button onClick={() => setIsDnModalOpen(true)}
          className="px-4 py-2 border border-slate-400 text-slate-700 font-bold rounded-md hover:bg-slate-50">
          + 납품지시서 생성
        </button>
      </div>
      <DeliverySection />

      {/* ── OCR 모달 ── */}
      {isOcrOpen && (
        <OcrModal
          onClose={() => setIsOcrOpen(false)}
          onConfirm={fetchOrders}
        />
      )}

      {/* ── 신규 발주서 모달 ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg w-[600px] max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-6">신규 발주서 생성</h2>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">거래처</label>
                <select value={newOrder.partner_id}
                  onChange={e => setNewOrder({ ...newOrder, partner_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white">
                  <option value="">거래처 선택</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">납기 예정일</label>
                <input type="date" value={newOrder.expected_date}
                  onChange={e => setNewOrder({ ...newOrder, expected_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">비고</label>
                <input type="text" value={newOrder.note}
                  onChange={e => setNewOrder({ ...newOrder, note: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-gray-700">품목</label>
                  <button onClick={handleAddItem} className="text-sm text-blue-600 font-bold">+ 품목 추가</button>
                </div>
                {newOrder.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                    <select value={item.item_id}
                      onChange={e => handleItemChange(index, 'item_id', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="">품목 선택</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input type="number" placeholder="수량" value={item.quantity}
                      onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm text-right" />
                    <input type="number" placeholder="단가" value={item.unit_price}
                      onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))}
                      className="w-24 border border-gray-300 rounded-lg px-2 py-2 text-sm text-right" />
                    {newOrder.items.length > 1 && (
                      <button onClick={() => handleRemoveItem(index)} className="text-red-400 font-bold text-lg">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-5">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-md">취소</button>
              <button onClick={handleCreateOrder} className="px-5 py-2 bg-slate-800 text-white font-bold rounded-md hover:bg-slate-900">발주서 생성</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 납품지시서 모달 ── */}
      {isDnModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg w-[500px]">
            <h2 className="text-xl font-bold text-gray-800 mb-6">납품지시서 생성</h2>
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">납품처</label>
                <select value={newDn.partner_id}
                  onChange={e => setNewDn({ ...newDn, partner_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white">
                  <option value="">거래처 선택</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">납품 품목</label>
                <select value={newDn.item_id}
                  onChange={e => setNewDn({ ...newDn, item_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white">
                  <option value="">품목 선택</option>
                  {items.filter(i => i.item_type === '완제품').map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">수량</label>
                <input type="number" value={newDn.quantity}
                  onChange={e => setNewDn({ ...newDn, quantity: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-5">
              <button onClick={() => setIsDnModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-md">취소</button>
              <button onClick={handleCreateDn} className="px-5 py-2 bg-slate-800 text-white font-bold rounded-md hover:bg-slate-900">납품지시서 생성</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default KanbanBoard;
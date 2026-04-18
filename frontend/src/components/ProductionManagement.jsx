import React, { useState, useEffect } from 'react';
import api from '../api';

function ProductionManagement() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [finishedItems, setFinishedItems] = useState([]);
  const [newOrder, setNewOrder] = useState({
    product_id: '',
    target_qty: 0,
    start_date: '',
    due_date: '',
  });

  const fetchWorkOrders = () => {
    api.get('/api/production/workorders/')
      .then(res => {
        setWorkOrders(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkOrders();
    api.get('/api/production/items/finished/')
      .then(res => setFinishedItems(res.data));
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-600';
      case 'completed':   return 'bg-green-100 text-green-600';
      case 'pending':     return 'bg-gray-100 text-gray-600';
      case 'cancelled':   return 'bg-red-100 text-red-600';
      default:            return 'bg-gray-100 text-gray-600';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder({ ...newOrder, [name]: value });
  };

  const handleSubmitOrder = () => {
    if (!newOrder.product_id || newOrder.target_qty <= 0) {
      alert('제품과 수량을 입력해주세요');
      return;
    }
    api.post('/api/production/workorders/create/', newOrder)
      .then(res => {
        alert(`${res.data.order_number} 생성 완료!`);
        setIsModalOpen(false);
        setNewOrder({ product_id: '', target_qty: 0, start_date: '', due_date: '' });
        fetchWorkOrders();
      })
      .catch(err => alert(err.response?.data?.error || '오류 발생'));
  };

  const handleStatusChange = (orderId, newStatus) => {
    api.patch(`/api/production/workorders/${orderId}/status/`, { status: newStatus })
      .then(() => fetchWorkOrders())
      .catch(err => alert(err.response?.data?.error || '오류 발생'));
  };

  if (loading) return <p>로딩 중...</p>;

  const activeOrders = workOrders.filter(o => o.status === 'in_progress');

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-3xl font-bold text-gray-800">생산 관리 및 작업 지시</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2 bg-slate-800 text-white font-bold rounded-md hover:bg-slate-900"
        >
          + 신규 작업 지시
        </button>
      </div>

      {/* 가동 중인 생산 라인 */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">가동 중인 생산 라인</h2>
      <div className="grid grid-cols-2 gap-6 mb-10">
        {activeOrders.length > 0 ? activeOrders.map(order => (
          <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-800">{order.order_number}</h3>
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">가동 중</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              현재 작업: <span className="font-bold text-gray-700">{order.product_name}</span>
            </p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${order.progress}%` }}></div>
              </div>
              <span className="text-sm font-bold text-gray-700">
                {order.actual_qty} / {order.target_qty} ({order.progress}%)
              </span>
            </div>
          </div>
        )) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-400">가동 중인 라인 없음</p>
          </div>
        )}
      </div>

      {/* 작업 지시서 목록 */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">작업 지시 목록 (Work Orders)</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-bold">지시 번호</th>
              <th className="p-4 font-bold">생산 목표 제품</th>
              <th className="p-4 font-bold text-right">목표 수량</th>
              <th className="p-4 font-bold text-center">상태</th>
              <th className="p-4 font-bold text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workOrders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-gray-500">{order.order_number}</td>
                <td className="p-4 font-bold text-gray-800">{order.product_name}</td>
                <td className="p-4 font-bold text-slate-700 text-right">{order.target_qty} 개</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(order.status)}`}>
                    {order.status_display}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700"
                  >
                    <option value="pending">대기</option>
                    <option value="in_progress">진행중</option>
                    <option value="completed">완료</option>
                    <option value="cancelled">취소</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 신규 작업 지시 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg w-[500px]">
            <h2 className="text-xl font-bold text-gray-800 mb-6">신규 생산 작업 지시</h2>
            <div className="flex flex-col gap-5 mb-8">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">생산 목표 제품</label>
                <select
                  name="product_id"
                  value={newOrder.product_id}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">제품 선택</option>
                  {finishedItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">목표 수량</label>
                <input
                  type="number"
                  name="target_qty"
                  value={newOrder.target_qty}
                  onChange={handleInputChange}
                  className="w-32 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 font-bold outline-none focus:border-blue-500 text-right"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">시작일</label>
                <input
                  type="date"
                  name="start_date"
                  value={newOrder.start_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">마감일</label>
                <input
                  type="date"
                  name="due_date"
                  value={newOrder.due_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-md">취소</button>
              <button onClick={handleSubmitOrder} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700">지시 내리기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductionManagement;
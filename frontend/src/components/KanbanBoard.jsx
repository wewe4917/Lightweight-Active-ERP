import React, { useState } from 'react';

function KanbanBoard() {
  // 🌟 1. 백엔드에서 받아왔다고 가정하는 가상의(Mock) 데이터 배열입니다.
  // 나중에 백엔드 API가 완성되면, 이 배열 자리에 서버에서 받아온 데이터가 들어갑니다!
  const [orders, setOrders] = useState([
    { id: 'ORD-20260326', partner: '로얄 바이오 시스템즈', summary: '고강도 볼베어링 A형 외 2건', status: '발주 대기' },
    { id: 'ORD-20260327', partner: '하온 바이오 솔루션즈', summary: '서스펜션 브래킷 A 외 1건', status: '발주 대기' },
    { id: 'ORD-20260321', partner: 'Toyota 아산법인', summary: '냉연강판 2.0t 외 4건', status: '상품 준비 중' },
    // 재미를 위해 새로운 주문도 하나 추가해 봤습니다!
    { id: 'ORD-20260402', partner: '한국 폴리텍 부품', summary: '강철 프레임 B형 외 3건', status: '배송 중' }, 
  ]);

  // 🌟 2. 전체 주문(orders)에서 특정 상태(status)인 것만 쏙쏙 골라내는(filter) 함수!
  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  // 🌟 3. 각 기둥에 들어갈 주문들을 미리 분류해 둡니다.
  const pendingOrders = getOrdersByStatus('발주 대기');
  const preparingOrders = getOrdersByStatus('상품 준비 중');
  const shippingOrders = getOrdersByStatus('배송 중');
  const completedOrders = getOrdersByStatus('배송 완료');

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">발주 및 납품 현황 보드</h1>
      <div className="flex gap-6 h-[calc(100vh-160px)] overflow-x-auto pb-4">
        
        {/* 기둥 1: 발주 대기 */}
        <div className="w-72 flex-shrink-0 bg-slate-100 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center px-2 pt-2">
            <h2 className="text-lg font-bold text-gray-700">발주 대기</h2>
            {/* 🌟 4. 카드가 몇 개인지(length) 자동으로 세어서 뱃지에 보여줍니다! */}
            <span className="bg-slate-200 text-slate-600 text-sm font-bold px-2 py-1 rounded-full">
              {pendingOrders.length}
            </span>
          </div>
          
          {/* 🌟 5. 대망의 map 함수! 배열에 있는 개수만큼 카드를 무한 복사해서 만들어냅니다. */}
          {pendingOrders.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-400 mb-2 font-medium">{order.id}</p>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">발주처 : {order.partner}</h3>
              <p className="text-gray-500 text-sm">{order.summary}</p>
            </div>
          ))}
        </div>

        {/* 기둥 2: 상품 준비 중 */}
        <div className="w-72 flex-shrink-0 bg-slate-100 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center px-2 pt-2">
            <h2 className="text-lg font-bold text-gray-700">상품 준비 중</h2>
            <span className="bg-blue-100 text-blue-600 text-sm font-bold px-2 py-1 rounded-full">
              {preparingOrders.length}
            </span>
          </div>
          {preparingOrders.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-blue-200 cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-400 mb-2 font-medium">{order.id}</p>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">발주처 : {order.partner}</h3>
              <p className="text-gray-500 text-sm">{order.summary}</p>
            </div>
          ))}
        </div>

        {/* 기둥 3: 배송 중 */}
        <div className="w-72 flex-shrink-0 bg-slate-100 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center px-2 pt-2">
            <h2 className="text-lg font-bold text-gray-700">배송 중</h2>
            <span className="bg-orange-100 text-orange-600 text-sm font-bold px-2 py-1 rounded-full">
              {shippingOrders.length}
            </span>
          </div>
          {shippingOrders.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-orange-200 cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-400 mb-2 font-medium">{order.id}</p>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">발주처 : {order.partner}</h3>
              <p className="text-gray-500 text-sm">{order.summary}</p>
            </div>
          ))}
        </div>

        {/* 기둥 4: 배송 완료 */}
        <div className="w-72 flex-shrink-0 bg-slate-100 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center px-2 pt-2">
            <h2 className="text-lg font-bold text-gray-700">배송 완료</h2>
            <span className="bg-green-100 text-green-600 text-sm font-bold px-2 py-1 rounded-full">
              {completedOrders.length}
            </span>
          </div>
          {completedOrders.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-green-200 cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-400 mb-2 font-medium">{order.id}</p>
              <h3 className="font-bold text-gray-800 mb-2 text-lg">발주처 : {order.partner}</h3>
              <p className="text-gray-500 text-sm">{order.summary}</p>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}

export default KanbanBoard;
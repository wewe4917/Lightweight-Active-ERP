import React, { useState } from 'react';

function ProductionManagement() {
  const [workOrders, setWorkOrders] = useState([
    { id: 'WO-260401', product: '서스펜션 브래킷 A', line: '조립 라인 1', targetQty: 500, currentQty: 350, status: '생산 중' },
    { id: 'WO-260402', product: '고강도 볼베어링 C형', line: '가공 라인 A', targetQty: 1000, currentQty: 1000, status: '생산 완료' },
    { id: 'WO-260403', product: '냉연강판 2.0t (절단)', line: '절단 라인 2', targetQty: 200, currentQty: 0, status: '대기 중' },
  ]);

  // 🌟 1. 팝업창(Modal) 스위치와 새로운 입력 데이터를 담을 빈 상자
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    product: '',
    line: '조립 라인 1', // 기본값
    targetQty: 0
  });

  // 상태 뱃지 색상 함수
  const getStatusBadge = (status) => {
    switch (status) {
      case '생산 중': return 'bg-blue-100 text-blue-600';
      case '생산 완료': return 'bg-green-100 text-green-600';
      case '대기 중': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // 🌟 2. 폼 입력값 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder({ ...newOrder, [name]: value });
  };

  // 🌟 3. '지시 내리기' 버튼을 눌렀을 때 실행될 함수
  const handleSubmitOrder = () => {
    if (!newOrder.product || newOrder.targetQty <= 0) {
      alert("제품명과 1개 이상의 수량을 입력해주세요!");
      return;
    }

    // 새로운 작업 지시서 데이터 조립하기
    const orderToAdd = {
      id: `WO-${Date.now().toString().slice(-6)}`, // 고유 번호 임시 생성 (예: WO-123456)
      product: newOrder.product,
      line: newOrder.line,
      targetQty: Number(newOrder.targetQty),
      currentQty: 0,
      status: '대기 중' // 처음 생성되면 무조건 대기 중!
    };

    // 기존 배열에 새 지시서 추가하고 팝업 닫기
    setWorkOrders([...workOrders, orderToAdd]);
    setIsModalOpen(false);
    
    // 다음 입력을 위해 폼 초기화
    setNewOrder({ product: '', line: '조립 라인 1', targetQty: 0 });
    
    alert(`[${orderToAdd.id}] 신규 작업 지시가 성공적으로 등록되었습니다!`);
  };

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-3xl font-bold text-gray-800">생산 관리 및 작업 지시</h1>
        {/* 🌟 4. 버튼 클릭 시 팝업 열기 */}
        <button onClick={() => setIsModalOpen(true)} className="px-5 py-2 bg-slate-800 text-white font-bold rounded-md hover:bg-slate-900 transition-colors">
          + 신규 작업 지시
        </button>
      </div>

      {/* 가동 중인 생산 라인 영역 (기존과 동일) */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">가동 중인 생산 라인</h2>
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-800">조립 라인 1</h3>
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">가동 중</span>
          </div>
          <p className="text-sm text-gray-500 mb-2">현재 작업: <span className="font-bold text-gray-700">서스펜션 브래킷 A (WO-260401)</span></p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: '70%' }}></div>
            </div>
            <span className="text-sm font-bold text-gray-700">350 / 500 (70%)</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-800">가공 라인 A</h3>
            <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">유휴 상태</span>
          </div>
          <p className="text-sm text-gray-500 mb-2">현재 작업: <span className="font-medium text-gray-400">대기 중인 작업 없음</span></p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '0%' }}></div>
            </div>
            <span className="text-sm font-bold text-gray-400">0 / 0 (0%)</span>
          </div>
        </div>
      </div>

      {/* 작업 지시서 목록 (기존과 동일하지만 workOrders가 추가되면 자동으로 업데이트됨!) */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">작업 지시 목록 (Work Orders)</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-bold">지시 번호</th>
              <th className="p-4 font-bold">생산 목표 제품 (BOM)</th>
              <th className="p-4 font-bold">할당 라인</th>
              <th className="p-4 font-bold text-right">목표 수량</th>
              <th className="p-4 font-bold text-center">상태</th>
              <th className="p-4 font-bold text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workOrders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-gray-500">{order.id}</td>
                <td className="p-4 font-bold text-gray-800">{order.product}</td>
                <td className="p-4 text-gray-600">{order.line}</td>
                <td className="p-4 font-bold text-slate-700 text-right">{order.targetQty} 개</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button className="px-4 py-1.5 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-bold transition-colors">
                    상세 보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🚨 5. 신규 작업 지시 모달 (isModalOpen이 true일 때만 렌더링!) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg w-[500px]">
            <h2 className="text-xl font-bold text-gray-800 mb-6">신규 생산 작업 지시</h2>
            
            <div className="flex flex-col gap-5 mb-8">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">생산 목표 제품 (BOM)</label>
                <input 
                  type="text" 
                  name="product"
                  value={newOrder.product}
                  onChange={handleInputChange}
                  placeholder="예: 산업용 모터 하우징"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 outline-none focus:border-blue-500" 
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">할당할 생산 라인</label>
                <select 
                  name="line"
                  value={newOrder.line}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="조립 라인 1">조립 라인 1</option>
                  <option value="가공 라인 A">가공 라인 A</option>
                  <option value="절단 라인 2">절단 라인 2</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">목표 수량</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    name="targetQty"
                    value={newOrder.targetQty}
                    onChange={handleInputChange}
                    className="w-32 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 font-bold outline-none focus:border-blue-500 text-right" 
                  />
                  <span className="text-gray-500 font-medium">개</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-md transition-colors">
                취소
              </button>
              <button onClick={handleSubmitOrder} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors">
                지시 내리기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductionManagement;
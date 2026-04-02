import React from 'react';

function Dashboard() {
  // 🌟 1. 상단 KPI 카드용 가상 데이터
  const kpiData = [
    { id: 1, title: '금일 총 생산량', value: '1,240', unit: '개', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 2, title: '평균 불량률', value: '1.2', unit: '%', color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 3, title: '재고 부족 품목', value: '3', unit: '건', color: 'text-red-500', bgColor: 'bg-red-50' },
    { id: 4, title: '가동 중인 라인', value: '4 / 5', unit: '라인', color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
  ];

  // 🌟 2. 하단 알림 리스트용 가상 데이터 (익숙한 발주처들이 보이시죠? 😉)
  const notifications = [
    { id: 1, time: '10:30 AM', message: '[긴급] 6각볼트 M10 안전재고 미달', type: 'text-red-500' },
    { id: 2, time: '09:15 AM', message: '하온 바이오 솔루션즈 발주건 배송 시작', type: 'text-blue-500' },
    { id: 3, time: '08:45 AM', message: 'Toyota 아산법인 자재 입고 완료', type: 'text-green-500' },
    { id: 4, time: '08:00 AM', message: '오전 주간 교대조 작업 시작', type: 'text-gray-500' },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">전체 현황 대시보드</h1>
      
      {/* 1. 상단 KPI 요약 카드 영역 (Grid로 4칸 일정하게 나누기) */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi) => (
          <div key={kpi.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center transition-transform hover:-translate-y-1">
            <h3 className="text-gray-500 font-medium mb-2">{kpi.title}</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</span>
              <span className="text-gray-400 font-medium">{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. 하단 차트 & 알림 영역 (Grid로 좌측 2칸, 우측 1칸 비율로 나누기) */}
      <div className="grid grid-cols-3 gap-6 h-[400px]">
        
        {/* 좌측: 생산량 추이 차트 (Tailwind로 간단하게 그린 막대 그래프 UI) */}
        <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">주간 생산량 추이</h2>
          
          <div className="flex-1 flex items-end gap-8 px-4 pb-4 border-b border-gray-100">
            {/* 막대그래프 1~5 */}
            <div className="flex-1 flex flex-col justify-end items-center gap-2 group">
              <div className="w-full bg-blue-100 rounded-t-md h-24 group-hover:bg-blue-300 transition-colors"></div>
              <span className="text-sm font-medium text-gray-500">월</span>
            </div>
            <div className="flex-1 flex flex-col justify-end items-center gap-2 group">
              <div className="w-full bg-blue-100 rounded-t-md h-32 group-hover:bg-blue-300 transition-colors"></div>
              <span className="text-sm font-medium text-gray-500">화</span>
            </div>
            <div className="flex-1 flex flex-col justify-end items-center gap-2 group">
              <div className="w-full bg-blue-500 rounded-t-md h-48 shadow-md"></div>
              <span className="text-sm font-bold text-blue-600">수 (오늘)</span>
            </div>
            <div className="flex-1 flex flex-col justify-end items-center gap-2 group">
              <div className="w-full bg-gray-100 rounded-t-md h-40"></div>
              <span className="text-sm font-medium text-gray-400">목</span>
            </div>
            <div className="flex-1 flex flex-col justify-end items-center gap-2 group">
              <div className="w-full bg-gray-100 rounded-t-md h-20"></div>
              <span className="text-sm font-medium text-gray-400">금</span>
            </div>
          </div>
        </div>

        {/* 우측: 타임라인 알림 리스트 */}
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">최근 알림</h2>
          
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-2">
            {notifications.map((noti) => (
              <div key={noti.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1 ${noti.type.replace('text', 'bg')}`}></div>
                  <div className="w-0.5 h-full bg-gray-100 my-1"></div>
                </div>
                <div className="flex flex-col pb-2">
                  <span className="text-xs text-gray-400 font-bold mb-1">{noti.time}</span>
                  <span className={`text-sm font-medium ${noti.type === 'text-gray-500' ? 'text-gray-600' : noti.type}`}>
                    {noti.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}

export default Dashboard;
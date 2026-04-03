import React, { useState, useEffect } from 'react';
import api from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/inventory/dashboard/')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>로딩 중...</p>;

  const kpiData = [
    { id: 1, title: '금일 총 생산량', value: stats?.total_production?.toLocaleString() || '0', unit: '개', color: 'text-blue-600' },
    { id: 2, title: '평균 불량률', value: stats?.defect_rate || '0', unit: '%', color: 'text-green-600' },
    { id: 3, title: '재고 부족 품목', value: stats?.low_stock_count || '0', unit: '건', color: 'text-red-500' },
    { id: 4, title: '가동 중인 라인', value: `${stats?.active_lines || 0} / ${stats?.total_lines || 5}`, unit: '라인', color: 'text-indigo-600' },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">전체 현황 대시보드</h1>

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

      <div className="grid grid-cols-3 gap-6 h-[400px]">
        <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">주간 생산량 추이</h2>
          <div className="flex-1 flex items-end gap-8 px-4 pb-4 border-b border-gray-100">
            {['월','화','수 (오늘)','목','금'].map((day, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group">
                <div className={`w-full rounded-t-md ${i === 2 ? 'bg-blue-500 h-48' : 'bg-blue-100 h-24'}`}></div>
                <span className={`text-sm font-medium ${i === 2 ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">최근 알림</h2>
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-2">
            {stats?.notifications?.length > 0 ? (
              stats.notifications.map((noti, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full mt-1 bg-red-500"></div>
                    <div className="w-0.5 h-full bg-gray-100 my-1"></div>
                  </div>
                  <div className="flex flex-col pb-2">
                    <span className="text-sm font-medium text-red-500">{noti.message}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">알림이 없습니다</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
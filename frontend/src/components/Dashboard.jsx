import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../api';

Chart.register(...registerables);

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const barChartInstance = useRef(null);
  const doughnutChartInstance = useRef(null);

  const fetchStats = (productId = '') => {
    const url = productId
      ? `/api/inventory/dashboard/?product_id=${productId}`
      : '/api/inventory/dashboard/';
    api.get(url)
      .then(res => { setStats(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  // 주간 생산량 바 차트
  useEffect(() => {
    if (!stats || !barChartRef.current) return;
    if (barChartInstance.current) barChartInstance.current.destroy();

    barChartInstance.current = new Chart(barChartRef.current, {
      type: 'bar',
      data: {
        labels: stats.weekly_data.map(d => `${d.day}(${d.date})`),
        datasets: [{
          label: '생산량 (개)',
          data: stats.weekly_data.map(d => d.qty),
          backgroundColor: stats.weekly_data.map((_, i) =>
            i === stats.weekly_data.length - 1 ? '#3b82f6' : '#bfdbfe'
          ),
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });

    return () => { if (barChartInstance.current) barChartInstance.current.destroy(); };
  }, [stats]);

  // 재고 부족 도넛 차트
  useEffect(() => {
    if (!stats || !doughnutChartRef.current) return;
    if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();

    const lowItems = stats.low_stock_items.slice(0, 5);
    if (lowItems.length === 0) return;

    doughnutChartInstance.current = new Chart(doughnutChartRef.current, {
      type: 'doughnut',
      data: {
        labels: lowItems.map(i => i.name),
        datasets: [{
          data: lowItems.map(i => i.safety - i.current > 0 ? i.safety - i.current : 1),
          backgroundColor: ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4'],
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const item = lowItems[ctx.dataIndex];
                return ` ${item.name}: 현재 ${item.current}${item.unit} / 안전 ${item.safety}${item.unit}`;
              }
            }
          }
        }
      }
    });

    return () => { if (doughnutChartInstance.current) doughnutChartInstance.current.destroy(); };
  }, [stats]);

  if (loading) return <p>로딩 중...</p>;

  const kpiData = [
    { id: 1, title: '금일 총 생산량',  value: stats?.total_production?.toLocaleString() || '0', unit: '개',   color: 'text-blue-600'   },
    { id: 2, title: '평균 불량률',      value: stats?.defect_rate || '0',                         unit: '%',    color: 'text-green-600'  },
    { id: 3, title: '재고 부족 품목',   value: stats?.low_stock_count || '0',                     unit: '건',   color: 'text-red-500'    },
    { id: 4, title: '가동 중인 라인',   value: `${stats?.active_lines || 0} / ${stats?.total_lines || 0}`, unit: '라인', color: 'text-indigo-600' },
  ];

  const dangerAlerts = stats?.notifications?.filter(n => n.level === 'danger') || [];

  return (
    <>
      {/* 능동형 경고 알림 배너 */}
      {showAlert && dangerAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-xl mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="font-bold text-red-600 mb-1">재고 부족 경고 {dangerAlerts.length}건</p>
            <div className="flex flex-col gap-1">
              {dangerAlerts.map((alert, i) => (
                <p key={i} className="text-sm text-red-500">{alert.message}</p>
              ))}
            </div>
          </div>
          <button onClick={() => setShowAlert(false)} className="text-red-400 hover:text-red-600 font-bold text-lg">×</button>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-800 mb-8">전체 현황 대시보드</h1>

      {/* KPI 카드 */}
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

      {/* 차트 영역 */}
      <div className="grid grid-cols-3 gap-6 mb-6">

        {/* 주간 생산량 바 차트 */}
        <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">주간 생산량 추이</h2>
            <select
              value={selectedProductId}
              onChange={e => {
                setSelectedProductId(e.target.value);
                fetchStats(e.target.value);
              }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white outline-none focus:border-blue-500"
            >
              <option value="">전체 제품</option>
              {stats?.bom_products?.map(p => (
                <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ height: '280px' }}>
            <canvas ref={barChartRef} />
          </div>
        </div>

        {/* 재고 부족 도넛 차트 */}
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">재고 부족 현황</h2>
          {stats?.low_stock_items?.length > 0 ? (
            <div style={{ height: '280px' }}>
              <canvas ref={doughnutChartRef} />
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-green-500 font-bold text-sm">✅ 재고 부족 품목 없음</p>
            </div>
          )}
        </div>
      </div>

      {/* 알림 + 재고부족 테이블 */}
      <div className="grid grid-cols-3 gap-6">

        {/* 최근 알림 */}
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">최근 알림</h2>
          <div className="flex flex-col gap-3 max-h-[240px] overflow-y-auto pr-1">
            {stats?.notifications?.length > 0 ? (
              stats.notifications.map((noti, i) => (
                <div key={i} className={`flex gap-3 p-3 rounded-lg ${noti.level === 'danger' ? 'bg-red-50' : 'bg-blue-50'}`}>
                  <span>{noti.level === 'danger' ? '🔴' : '🔵'}</span>
                  <p className={`text-sm font-medium ${noti.level === 'danger' ? 'text-red-600' : 'text-blue-600'}`}>
                    {noti.message}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">알림이 없습니다</p>
            )}
          </div>
        </div>

        {/* 재고 부족 품목 테이블 */}
        <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">재고 부족 품목 상세</h2>
          {stats?.low_stock_items?.length > 0 ? (
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                    <th className="p-3 font-bold">품번</th>
                    <th className="p-3 font-bold">품목명</th>
                    <th className="p-3 font-bold text-right">현재 재고</th>
                    <th className="p-3 font-bold text-right">안전 재고</th>
                    <th className="p-3 font-bold text-right">부족량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.low_stock_items.map((item, i) => (
                    <tr key={i} className="hover:bg-red-50 transition-colors">
                      <td className="p-3 text-gray-500 text-sm">{item.code}</td>
                      <td className="p-3 font-bold text-gray-800 text-sm">{item.name}</td>
                      <td className="p-3 text-right font-bold text-red-500 text-sm">{item.current}{item.unit}</td>
                      <td className="p-3 text-right text-gray-500 text-sm">{item.safety}{item.unit}</td>
                      <td className="p-3 text-right font-bold text-orange-500 text-sm">
                        -{(item.safety - item.current).toFixed(0)}{item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center">
              <p className="text-green-500 font-bold">✅ 모든 품목 재고 정상</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
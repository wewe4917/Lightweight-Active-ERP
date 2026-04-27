import React, { useState, useEffect } from 'react';
import api from '../api';

function DetailCell({ detail }) {
  if (!detail) return <span className="text-gray-300">-</span>;
  try {
    const data = JSON.parse(detail);
    if (data.summary) {
      return (
        <span className="text-gray-600 text-xs">{data.summary}</span>
      );
    }
  } catch {}
  return <span className="text-gray-400 text-xs truncate">{detail}</span>;
}

function fieldLabel(key) {
  const map = {
    item_id:      '품목',
    quantity:     '수량',
    unit_price:   '단가',
    lot_number:   'LOT번호',
    purpose:      '목적',
    note:         '비고',
    partner_id:   '거래처',
    product_id:   '제품',
    target_qty:   '목표수량',
    actual_qty:   '실생산량',
    defect_qty:   '불량수량',
    start_date:   '시작일',
    due_date:     '마감일',
    status:       '상태',
    material_id:  '자재',
    expected_date:'납기예정일',
    name:         '이름',
    code:         '코드',
    item_type:    '품목유형',
    safety_stock: '안전재고',
  };
  return map[key] || key;
}

function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/api/core/logs/')
      .then(res => { setLogs(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getActionBadge = (action) => {
    switch(action) {
      case 'create': return 'bg-blue-100 text-blue-600';
      case 'update': return 'bg-yellow-100 text-yellow-600';
      case 'delete': return 'bg-red-100 text-red-500';
      case 'login':  return 'bg-green-100 text-green-600';
      default:       return 'bg-gray-100 text-gray-600';
    }
  };

  const filtered = logs.filter(log =>
    filter === '' ||
    log.user.includes(filter) ||
    log.model_name.includes(filter) ||
    log.action_display.includes(filter)
  );

  if (loading) return <p>로딩 중...</p>;

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">감사 로그</h1>
          <p className="text-gray-400 text-sm mt-1">누가 언제 무엇을 했는지 자동 기록됩니다</p>
        </div>
        <input
          type="text"
          placeholder="사용자 / 모델 / 액션 검색"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 w-64"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-bold">시각</th>
              <th className="p-4 font-bold">사용자</th>
              <th className="p-4 font-bold text-center">액션</th>
              <th className="p-4 font-bold">대상</th>
              <th className="p-4 font-bold">IP</th>
              <th className="p-4 font-bold">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">기록된 로그 없음</td>
              </tr>
            )}
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 text-gray-500 text-sm whitespace-nowrap">{log.timestamp}</td>
                <td className="p-4 font-bold text-gray-800">{log.user}</td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getActionBadge(log.action)}`}>
                    {log.action_display}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{log.model_name}</td>
                <td className="p-4 text-gray-500 text-sm">{log.ip_address}</td>
                <td className="p-4 text-xs max-w-xs">
                 <DetailCell detail={log.detail} action={log.action} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default AuditLogPage;
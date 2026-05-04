import React, { useState } from 'react';
import api from '../api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('아이디와 비밀번호를 입력하세요');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/accounts/login/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      localStorage.setItem('username', username);
      onLogin();
    } catch (err) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] p-10">

        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Potato ERP</h1>
          <p className="text-gray-400 text-sm mt-1">중소 제조기업 경량 능동 ERP</p>
        </div>

        {/* 입력 폼 */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">아이디</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="아이디를 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="비밀번호를 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-bold text-base transition-colors ${
              loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
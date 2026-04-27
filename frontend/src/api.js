import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

// 요청 시 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 응답 시 로그아웃 처리
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('username');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
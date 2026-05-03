import React, { useState, useRef } from 'react';
import api from '../api';

function OcrModal({ onClose, onConfirm }) {
  const [step, setStep] = useState('upload');
  const [preview, setPreview] = useState(null);
  const [rawText, setRawText] = useState('');
  const [partnerName, setPartnerName] = useState(null);
  const [matchedResults, setMatchedResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setStep('preview');
  };

  const handleOcr = async () => {
    const file = fileRef.current.files[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/api/purchasing/ocr/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setRawText(res.data.raw_text);
      setPartnerName(res.data.partner_name);
      setMatchedResults(res.data.matched_results.map(i => ({ ...i, selected: true })));
      setStep('confirm');
    } catch (err) {
      alert('OCR 처리 실패: ' + (err.response?.data?.error || '서버 오류'));
    } finally {
      setLoading(false);
    }
  };


  const handleConfirm = async () => {
    const targets = matchedResults.filter(i => i.selected);
    if (targets.length === 0) { alert('입고완료 처리할 항목을 선택하세요'); return; }

    const mismatchItems = targets.filter(i => i.quantity_mismatch);
    if (mismatchItems.length > 0) {
      const names = mismatchItems.map(i => `[${i.item_code}] ${i.item_name} (발주 ${i.po_quantity}개 → 납품 ${i.quantity}개)`).join('\n');
      const ok = window.confirm(`다음 항목은 납품서 수량과 발주 수량이 다릅니다.\n\n${names}\n\n그래도 입고처리를 진행하시겠습니까?`);
      if (!ok) return;
    }

    try {
      await api.post('/api/purchasing/ocr/complete/', { items: targets });
      alert(`✅ ${targets.length}건 입고완료 처리되었습니다`);
      onConfirm();
      onClose();
    } catch {
      alert('입고완료 처리 실패');
    }
  };

  

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[560px] max-h-[80vh] overflow-y-auto">

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <h2 className="text-xl font-bold text-gray-800 mb-2">📄 납품서 OCR 입고처리</h2>
        <p className="text-gray-500 text-sm mb-6">납품서를 스캔하면 발주서와 자동 대조 후 입고완료 처리합니다</p>

        {step === 'upload' && (
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-slate-400 transition"
          >
            <p className="text-4xl mb-3">📷</p>
            <p className="text-gray-600 font-bold">클릭하여 납품서 이미지 업로드</p>
            <p className="text-gray-400 text-sm mt-1">JPG, PNG 지원</p>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <img src={preview} alt="미리보기" className="w-full rounded-lg border border-gray-200 mb-4 max-h-64 object-contain" />
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('upload'); setPreview(null); }}
                className="flex-1 py-2 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50"
              >
                다시 선택
              </button>
              <button
                onClick={handleOcr}
                disabled={loading}
                className="flex-1 py-2 bg-slate-800 text-white font-bold rounded-md hover:bg-slate-900 disabled:opacity-50"
              >
                {loading ? '인식 중...' : '🔍 OCR 인식 시작'}
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            {/* 거래처 */}
            <div className="mb-5 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-gray-500 mb-1">인식된 공급자</p>
              {partnerName
                ? <p className="font-bold text-gray-800">✅ {partnerName}</p>
                : <p className="text-red-400 font-bold">⚠ 거래처 인식 실패 - 발주서와 대조 불가</p>
              }
            </div>

            {/* 매칭 결과 */}
            <p className="text-sm font-bold text-gray-500 mb-2">
              발주서 대조 결과 ({matchedResults.length}건 매칭)
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {matchedResults.length === 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-red-500 font-bold text-sm">매칭된 발주서 항목이 없습니다</p>
                  <p className="text-red-400 text-xs mt-1">거래처명, 품번, 수량이 모두 일치해야 매칭됩니다</p>
                </div>
              )}
              {matchedResults.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${item.selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={e => {
                      const updated = [...matchedResults];
                      updated[idx].selected = e.target.checked;
                      setMatchedResults(updated);
                    }}
                    className="w-4 h-4 accent-slate-700"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">[{item.item_code}] {item.item_name}</p>
                    <p className="text-xs text-gray-400">발주서: {item.po_number}</p>
                    {item.quantity_mismatch && (
                      <p className="text-xs text-orange-500 font-bold mt-0.5">
                        ⚠ 발주 {item.po_quantity}개 → 납품 {item.quantity}개 (수량 불일치)
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-700 text-sm">{item.quantity}개</p>
                  </div>
                </div>
              ))}
            </div>

            <details className="mb-4">
              <summary className="text-xs text-gray-400 cursor-pointer">OCR 원본 텍스트 보기</summary>
              <pre className="text-xs text-gray-500 bg-gray-50 p-3 rounded mt-2 whitespace-pre-wrap">{rawText}</pre>
            </details>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50">취소</button>
              <button
                onClick={handleConfirm}
                disabled={matchedResults.filter(i => i.selected).length === 0}
                className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                ✅ 입고완료 처리
              </button>
            </div>
          </div>
        )}

        {step !== 'confirm' && (
          <button onClick={onClose} className="w-full mt-3 py-2 text-gray-400 text-sm hover:text-gray-600">닫기</button>
        )}
      </div>
    </div>
  );
}

export default OcrModal;
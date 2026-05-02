import React, { useState, useRef } from 'react';
import api from '../api';

function OcrModal({ inventoryList, onClose, onConfirm }) {
  const [step, setStep] = useState('upload');
  const [preview, setPreview] = useState(null);
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
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
      const res = await api.post('/api/inventory/ocr/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setRawText(res.data.raw_text);

      const matched = res.data.parsed_items.map(parsed => {
        const codeMatch = parsed.name.match(/[A-Za-z0-9]+-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/);
        const extractedCode = codeMatch ? codeMatch[0].toUpperCase() : null;

        const found = extractedCode
          ? inventoryList.find(inv => inv.code.toUpperCase() === extractedCode)
          : null;

        return {
          ...parsed,
          item_id: found?.id || null,
          matched_name: found ? `[${found.code}] ${found.name}` : null,
          selected: !!found,
        };
      });

      setParsedItems(matched);
      setStep('confirm');
    } catch (err) {
      alert('OCR 처리 실패: ' + (err.response?.data?.error || '서버 오류'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const targets = parsedItems.filter(i => i.selected && i.item_id);
    if (targets.length === 0) { alert('입고할 품목을 선택하세요'); return; }
    try {
      for (const item of targets) {
        await api.post('/api/inventory/stock-in/', {
          item_id: item.item_id,
          quantity: item.quantity,
          purpose: 'other'
        });
      }
      alert(`${targets.length}건 입고 완료!`);
      onConfirm();
      onClose();
    } catch {
      alert('입고 처리 실패');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[520px] max-h-[80vh] overflow-y-auto">

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <h2 className="text-xl font-bold text-gray-800 mb-2">📄 납품서 OCR 입고</h2>
        <p className="text-gray-500 text-sm mb-6">납품서를 촬영하거나 업로드하면 품목/수량을 자동 인식합니다</p>

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
            <p className="text-sm font-bold text-gray-500 mb-2">인식된 품목 (체크 후 입고)</p>
            <div className="flex flex-col gap-2 mb-4">
              {parsedItems.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">인식된 품목이 없습니다.</p>
              )}
              {parsedItems.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${item.selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={e => {
                      const updated = [...parsedItems];
                      updated[idx].selected = e.target.checked;
                      setParsedItems(updated);
                    }}
                    className="w-4 h-4 accent-slate-700"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">
                      {item.matched_name || item.name}
                      {!item.item_id && <span className="ml-2 text-xs text-red-400">⚠ 미매칭</span>}
                    </p>
                    <p className="text-xs text-gray-400">OCR 인식: {item.name}</p>
                  </div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => {
                      const updated = [...parsedItems];
                      updated[idx].quantity = Number(e.target.value);
                      setParsedItems(updated);
                    }}
                    className="w-20 border border-gray-300 rounded-md text-center text-sm font-bold p-1"
                  />
                  <span className="text-gray-400 text-sm">개</span>
                </div>
              ))}
            </div>

            <details className="mb-4">
              <summary className="text-xs text-gray-400 cursor-pointer">OCR 원본 텍스트 보기</summary>
              <pre className="text-xs text-gray-500 bg-gray-50 p-3 rounded mt-2 whitespace-pre-wrap">{rawText}</pre>
            </details>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700"
              >
                ✅ 입고 등록
              </button>
            </div>
          </div>
        )}

        {step !== 'confirm' && (
          <button onClick={onClose} className="w-full mt-3 py-2 text-gray-400 text-sm hover:text-gray-600">
            닫기
          </button>
        )}
      </div>
    </div>
  );
}

export default OcrModal;
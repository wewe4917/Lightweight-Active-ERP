import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import OcrModal from './OcrModal';

function QrModal({ item, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && item) {
      QRCode.toCanvas(canvasRef.current, `item:${item.id}`, {
        width: 200,
        margin: 2,
      }).catch(err => console.error('QR 생성 실패:', err));
    }
  }, [item]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_${item.code}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[360px] text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">QR 코드</h2>

        <p className="text-gray-500 text-sm mb-6">
          [{item.code}] {item.name}
        </p>

        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} />
        </div>

        <p className="text-xs text-gray-400 mb-6">
          이 QR을 스캔하면 해당 품목의 입고 화면이 바로 열립니다
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50"
          >
            닫기
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 py-2 bg-slate-800 text-white font-bold rounded-md hover:bg-slate-900"
          >
            PNG 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

function Inventory() {
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [editQuantity, setEditQuantity] = useState(0);
  const [isStockIn, setIsStockIn] = useState(true);

  const [qrItem, setQrItem] = useState(null);

  const [isScanOpen, setIsScanOpen] = useState(false);

  // ✅ OCR 모달 상태 추가
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  const scannerRef = useRef(null);

  const fetchInventory = () => {
    api.get('/api/inventory/items/')
      .then(res => {
        setInventoryList(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (!isScanOpen) return;

    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        false
      );

      scanner.render(
        (decodedText) => {
          if (decodedText.startsWith('item:')) {
            const itemId = Number(decodedText.replace('item:', ''));

            const found = inventoryList.find(i => i.id === itemId);

            if (found) {
              scanner.clear();
              setIsScanOpen(false);
              openModal(found, true);
            } else {
              alert('등록되지 않은 품목입니다');
            }
          }
        },
        () => {}
      );

      scannerRef.current = scanner;
    }, 100);

    return () => {
      clearTimeout(timer);

      try {
        scannerRef.current?.clear();
      } catch (e) {}
    };
  }, [isScanOpen, inventoryList]);

  const openModal = (item, stockIn = true) => {
    setSelectedItem(item);
    setEditQuantity(0);
    setIsStockIn(stockIn);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editQuantity <= 0) {
      alert('수량을 1 이상 입력하세요');
      return;
    }

    const url = isStockIn
      ? '/api/inventory/stock-in/'
      : '/api/inventory/stock-out/';

    api.post(url, {
      item_id: selectedItem.id,
      quantity: editQuantity,
      purpose: 'other',
    })
      .then(res => {
        alert(
          `${isStockIn ? '입고' : '출고'} 완료! 현재 재고: ${res.data.current_stock}`
        );

        setIsModalOpen(false);
        fetchInventory();
      })
      .catch(err =>
        alert(err.response?.data?.error || '오류가 발생했습니다')
      );
  };

  if (loading) return <p>로딩 중...</p>;

  return (
    <>
      {/* 헤더 */}
      <div className="flex justify-between items-end mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          실시간 재고 현황
        </h1>

        {/* ✅ 버튼 2개 */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsOcrOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 text-sm"
          >
            📄 OCR 입고
          </button>

          <button
            onClick={() => setIsScanOpen(true)}
            className="px-4 py-2 bg-slate-800 text-white font-bold rounded-md hover:bg-slate-900 text-sm"
          >
            📷 QR 스캔 입고
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-bold">품번 (SKU)</th>
              <th className="p-4 font-bold">품목명</th>
              <th className="p-4 font-bold">카테고리</th>
              <th className="p-4 font-bold">현재 재고</th>
              <th className="p-4 font-bold text-center">상태</th>
              <th className="p-4 font-bold text-center">관리</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {inventoryList.map((item) => {
              const isShortage = item.is_low_stock;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4 text-gray-500 font-medium">
                    {item.code}
                  </td>

                  <td className="p-4 font-bold text-gray-800">
                    {item.name}
                  </td>

                  <td className="p-4 text-gray-600">
                    {item.item_type}
                  </td>

                  <td className="p-4 font-bold text-slate-700">
                    {item.current_stock}

                    <span className="text-sm font-normal text-gray-400">
                      {' '}
                      / {item.safety_stock}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isShortage
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {isShortage ? '재고 부족' : '정상'}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openModal(item, true)}
                        className="px-3 py-1.5 bg-blue-50 border border-blue-300 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-bold"
                      >
                        입고
                      </button>

                      <button
                        onClick={() => openModal(item, false)}
                        className="px-3 py-1.5 bg-red-50 border border-red-300 text-red-500 hover:bg-red-100 rounded-md text-sm font-bold"
                      >
                        출고
                      </button>

                      <button
                        onClick={() => setQrItem(item)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-bold"
                      >
                        QR
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 입고/출고 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg w-[400px]">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              {isStockIn ? '📦 입고 등록' : '🚚 출고 등록'}
            </h2>

            <div className="flex flex-col gap-4 mb-8">
              <div>
                <label className="text-sm font-bold text-gray-500 block mb-1">
                  선택된 품목
                </label>

                <div className="bg-gray-100 p-3 rounded-md text-gray-700 font-medium">
                  [{selectedItem.code}] {selectedItem.name}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-500 block mb-1">
                  현재 재고
                </label>

                <div className="bg-gray-100 p-3 rounded-md text-gray-700 font-medium">
                  {selectedItem.current_stock} {selectedItem.unit}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-500 block mb-1">
                  {isStockIn ? '입고 수량' : '출고 수량'}
                </label>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setEditQuantity(Math.max(0, editQuantity - 1))
                    }
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xl"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={editQuantity}
                    onChange={(e) =>
                      setEditQuantity(Number(e.target.value))
                    }
                    className="flex-1 h-10 border border-gray-300 rounded-lg text-center font-bold text-lg text-gray-800 outline-none focus:border-blue-500"
                  />

                  <button
                    onClick={() =>
                      setEditQuantity(editQuantity + 1)
                    }
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-md"
              >
                취소
              </button>

              <button
                onClick={handleSave}
                className={`px-5 py-2 text-white font-bold rounded-md ${
                  isStockIn
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isStockIn ? '입고 저장' : '출고 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR 생성 모달 */}
      {qrItem && (
        <QrModal
          item={qrItem}
          onClose={() => setQrItem(null)}
        />
      )}

      {/* QR 스캐너 모달 */}
      {isScanOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg w-[420px]">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📷 QR 스캔
            </h2>

            <p className="text-gray-500 text-sm mb-4">
              품목 QR 코드를 카메라에 비춰주세요.
              자동으로 입고 화면이 열립니다.
            </p>

            <div id="qr-reader" className="w-full"></div>

            <button
              onClick={() => {
                try {
                  scannerRef.current?.clear();
                } catch (e) {}

                setIsScanOpen(false);
              }}
              className="w-full mt-4 py-2 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ✅ OCR 모달 */}
      {isOcrOpen && (
        <OcrModal
          inventoryList={inventoryList}
          onClose={() => setIsOcrOpen(false)}
          onConfirm={fetchInventory}
        />
      )}
    </>
  );
}

export default Inventory;
'use client';

import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface GoodsReceivedReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: string | null;
}
export default function GoodsReceivedReceiptModal({
  isOpen,
  onClose,
  receiptId,
}: GoodsReceivedReceiptModalProps) {
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [karigarHistory, setKarigarHistory] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !receiptId) {
      setReceipt(null);
      setKarigarHistory(null);
      return;
    }

    const fetchReceiptDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/receipts/${receiptId}`);
        const rData = res.data;
        setReceipt(rData);

        if (rData.workOrder?.karigar?.id) {
          const histRes = await api.get(`/karigars/${rData.workOrder.karigar.id}/history`);
          setKarigarHistory(histRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch receipt details:', err);
        alert('Failed to load receipt details');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchReceiptDetails();
  }, [isOpen, receiptId, onClose]);

  if (!isOpen || !receiptId) return null;

  const karigar = receipt?.workOrder?.karigar;
  const name = karigar?.name || 'N/A';
  const phone = karigar?.phone || 'N/A';
  const dateStr = receipt?.date
    ? new Date(receipt.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'N/A';
  const receiptNo = receiptId.startsWith('RO-') ? receiptId : `REC-${receiptId.slice(0, 8).toUpperCase()}`;

  const getPendingBalance = (productId: string) => {
    if (!karigarHistory || !karigarHistory.workOrders) return 0;
    let balance = 0;
    karigarHistory.workOrders.forEach((wo: any) => {
      if (wo.status !== 'CANCELLED') {
        (wo.items || []).forEach((item: any) => {
          if (item.productId === productId) {
            balance += (item.quantity - (item.receivedQty || 0));
          }
        });
      }
    });
    return balance;
  };

  const formatWhatsAppPhone = (num: string) => {
    if (!num) return '';
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.slice(1);
    } else if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned;
  };

  const getWhatsAppMessage = () => {
    if (!receipt) return '';
    
    let message = `*Receipt Order:* ${receiptNo}\n`;
    message += `*SHABAB ZARI ART*\n`;
    message += `*Date:* ${dateStr}\n\n`;
    message += `*Received Items:*\n`;
    
    (receipt.items || []).forEach((item: any, index: number) => {
      const prodName = item.workOrderItem?.product?.name || 'Product';
      const prodType = item.workOrderItem?.product?.type || '';
      const pId = item.workOrderItem?.productId;
      const remainingBalance = pId ? getPendingBalance(pId) : 0;
      
      message += `${index + 1}. *${prodName} (${prodType})*\n`;
      message += `   - Receive (प्राप्त): ${item.quantity}\n`;
      message += `   - Balance: ${remainingBalance}\n\n`;
    });
    
    if (receipt.notes) {
      message += `*Notes:* ${receipt.notes}\n\n`;
    }
    
    message += `Thank you for your hard work!`;
    return message;
  };

  const handleWhatsApp = () => {
    const targetPhone = formatWhatsAppPhone(phone);
    const message = getWhatsAppMessage();
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 overflow-y-auto print:p-0">
      {/* Global CSS style for print hiding everything except receipt */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #goods-receipt-print-area, #goods-receipt-print-area * {
            visibility: visible !important;
          }
          #goods-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh] print:max-h-full print:shadow-none print:rounded-none">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <h3 className="text-lg font-bold text-slate-800">Goods Received Receipt</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content - Receipt Body */}
        <div className="p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible min-h-[250px] flex flex-col justify-center">
          {loading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-sm font-medium">Loading receipt details...</p>
            </div>
          ) : !receipt ? (
            <div className="text-center py-12 text-slate-400">Failed to load details</div>
          ) : (
            <div
              id="goods-receipt-print-area"
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50 print:border-none print:bg-white"
            >
              {/* Brand Header */}
              <div className="text-center border-b border-slate-200 pb-4 mb-4">
                <h1 className="text-2xl font-black tracking-tight text-slate-800">
                  ZARI INVENTORY
                </h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest">
                  Management System
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-green-50 border border-green-100 rounded-full text-xs font-bold text-green-700">
                  GOODS RECEIVED RECEIPT
                </div>
              </div>

              {/* Meta Details */}
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase">Receipt Info</p>
                  <p className="font-semibold text-slate-800 mt-1">{receiptNo}</p>
                  <p className="text-xs text-slate-500 mt-1">Date: {dateStr}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    WO: {receipt.workOrderId.startsWith('WO-') ? receipt.workOrderId : receipt.workOrderId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium uppercase">Karigar Details</p>
                  <p className="font-semibold text-slate-800 mt-1">{name}</p>
                  <p className="text-xs text-slate-500 mt-1">Ph: {phone}</p>
                </div>
              </div>

              {/* Receipt Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mb-6">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-xs font-bold uppercase text-slate-500">Item Name</th>
                      <th className="p-3 text-xs font-bold uppercase text-slate-500 text-center">Type</th>
                      <th className="p-3 text-xs font-bold uppercase text-slate-500 text-right">Qty Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(receipt.items || []).map((item: any, idx: number) => {
                      const prodName = item.workOrderItem?.product?.name || 'Product';
                      const prodType = item.workOrderItem?.product?.type || 'N/A';
                      return (
                        <tr key={item.id || idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="p-3">
                            <p className="font-medium text-slate-800">{prodName}</p>
                            {item.qualityNotes && (
                              <p className="text-[11px] text-slate-400 mt-0.5">Note: {item.qualityNotes}</p>
                            )}
                          </td>
                          <td className="p-3 text-center text-xs font-medium text-slate-500 uppercase">
                            {prodType}
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-800">
                            {item.quantity}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                      <td colSpan={2} className="p-3 text-slate-700">Total Quantity</td>
                      <td className="p-3 text-right text-indigo-700 text-base">
                        {receipt.items?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Notes Section */}
              {receipt.notes && (
                <div className="bg-white border border-slate-100 rounded-lg p-3 mb-6 text-sm">
                  <p className="text-xs text-slate-400 font-semibold uppercase mb-1">General Notes</p>
                  <p className="text-slate-600 italic font-mono text-xs">{receipt.notes}</p>
                </div>
              )}

              {/* Footer / Verification */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle size={14} />
                  <span>Items Deposited</span>
                </div>
                <div className="text-right">
                  <div className="h-8 w-28 border-b border-slate-300 ml-auto mb-1"></div>
                  <p className="text-[10px] uppercase">Receiver Signature</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Actions) */}
        {!loading && receipt && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
            >
              <Printer size={18} />
              <span>Print Challan</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.007 14.113.987 11.48.987 6.046.987 1.62 5.358 1.616 10.787c-.001 1.706.452 3.372 1.31 4.868l-.995 3.635 3.726-.976zm11.233-6.006c-.3-.15-1.774-.875-2.048-.976-.276-.1-.476-.15-.676.15-.2.3-.775.976-.95 1.176-.175.2-.35.225-.65.075-.301-.15-1.267-.467-2.413-1.49-1.01-.902-1.686-2.016-1.886-2.36-.2-.35-.021-.539.129-.688.136-.135.301-.35.451-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.628-.926-2.228-.244-.589-.493-.51-.676-.519-.174-.009-.374-.01-.574-.01-.2 0-.526.075-.801.374-.275.3-.1.776-.1 1.947 0 1.17.85 2.3.975 2.474.125.175 1.673 2.553 4.053 3.58.566.244 1.008.39 1.353.499.569.18 1.085.155 1.493.094.455-.068 1.399-.571 1.599-1.122.2-.55.2-1.02.14-1.122-.06-.1-.23-.15-.53-.3z"/>
              </svg>
              <span>Send WhatsApp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

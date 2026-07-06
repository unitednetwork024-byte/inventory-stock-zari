'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, X, Trash2, FileText } from 'lucide-react';
import GoodsReceivedReceiptModal from '@/components/GoodsReceivedReceiptModal';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [selectedKarigarId, setSelectedKarigarId] = useState<string>('');
  const [form, setForm] = useState({ workOrderId: '', date: '', notes: '' });
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      const res = await api.get(`/receipts?${params}`);
      setReceipts(res.data.data);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReceipts(); }, [page]);

  useEffect(() => {
    api.get('/work-orders?limit=100&status=IN_PROGRESS').then(r => setWorkOrders(r.data.data)).catch(() => {});
    api.get('/work-orders?limit=100&status=PENDING').then(r => setWorkOrders(prev => [...prev, ...r.data.data])).catch(() => {});
    api.get('/work-orders?limit=100&status=PARTIALLY_RECEIVED').then(r => setWorkOrders(prev => [...prev, ...r.data.data])).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ workOrderId: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setSelectedKarigarId('');
    setReceiptItems([]);
    setSelectedWO(null);
    setShowModal(true);
  };

  const selectKarigar = (karigarId: string) => {
    setSelectedKarigarId(karigarId);
    if (!karigarId) { setReceiptItems([]); return; }

    // Find all active work orders for this Karigar
    const activeWOsForKarigar = workOrders.filter(
      wo => wo.karigarId === karigarId && wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED'
    );

    // Group items by product
    const productItemsMap = new Map();
    activeWOsForKarigar.forEach(wo => {
      (wo.items || []).forEach((item: any) => {
        const pid = item.productId;
        const pending = item.quantity - (item.receivedQty || 0);
        if (pending > 0) {
          if (!productItemsMap.has(pid)) {
            productItemsMap.set(pid, {
              productId: pid,
              productName: item.product ? `${item.product.name} (${item.product.type})` : 'Product',
              assignedQty: 0,
              receivedQty: 0,
              pendingQty: 0,
              matchingItems: []
            });
          }
          const group = productItemsMap.get(pid);
          group.assignedQty += item.quantity;
          group.receivedQty += (item.receivedQty || 0);
          group.pendingQty += pending;
          group.matchingItems.push({
            workOrderId: wo.id,
            workOrderItemId: item.id,
            pending,
            createdAt: wo.createdAt
          });
        }
      });
    });

    const receiptItemsList = Array.from(productItemsMap.values()).map(group => {
      // Sort matching items oldest first
      group.matchingItems.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return {
        productId: group.productId,
        productName: group.productName,
        assignedQty: group.assignedQty,
        receivedQty: group.receivedQty,
        pendingQty: group.pendingQty,
        quantity: 0,
        qualityNotes: '',
        matchingItems: group.matchingItems
      };
    });

    setReceiptItems(receiptItemsList);
  };

  const updateReceiptItem = (idx: number, field: string, value: any) => {
    const items = [...receiptItems];
    (items[idx] as any)[field] = value;
    setReceiptItems(items);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKarigarId) return alert('Select a karigar');
    const validItems = receiptItems.filter(i => Number(i.quantity) > 0);
    if (validItems.length === 0) return alert('Enter quantity for at least one item');

    // Group allocations by workOrderId
    const allocationsByWorkOrder: { [woId: string]: any[] } = {};

    validItems.forEach(item => {
      let qtyToDistribute = Number(item.quantity);
      
      for (const match of item.matchingItems) {
        if (qtyToDistribute <= 0) break;
        
        const allocatedQty = Math.min(match.pending, qtyToDistribute);
        qtyToDistribute -= allocatedQty;

        if (!allocationsByWorkOrder[match.workOrderId]) {
          allocationsByWorkOrder[match.workOrderId] = [];
        }
        allocationsByWorkOrder[match.workOrderId].push({
          workOrderItemId: match.workOrderItemId,
          quantity: allocatedQty,
          qualityNotes: item.qualityNotes || ''
        });
      }

      if (qtyToDistribute > 0) {
        const lastMatch = item.matchingItems[item.matchingItems.length - 1];
        if (lastMatch) {
          const allocation = allocationsByWorkOrder[lastMatch.workOrderId].find(
            a => a.workOrderItemId === lastMatch.workOrderItemId
          );
          if (allocation) {
            allocation.quantity += qtyToDistribute;
          }
        }
      }
    });

    try {
      setLoading(true);
      let lastReceiptId = '';
      
      for (const woId of Object.keys(allocationsByWorkOrder)) {
        const res = await api.post('/receipts', {
          workOrderId: woId,
          date: form.date,
          notes: form.notes,
          items: allocationsByWorkOrder[woId]
        });
        lastReceiptId = res.data.id;
      }

      setShowModal(false);
      fetchReceipts();

      if (lastReceiptId) {
        setActiveReceiptId(lastReceiptId);
        setIsReceiptOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this receipt?')) return;
    try { await api.delete(`/receipts/${id}`); fetchReceipts(); }
    catch { alert('Failed to delete'); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Receipts</h1>
        <button onClick={openCreate} className="mt-3 sm:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
          <Plus size={18} /> Record Receipt
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Work Order</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Karigar</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Items</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Notes</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : receipts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No receipts found</td></tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-800 font-mono text-sm font-semibold">{r.workOrderId.startsWith('WO-') ? r.workOrderId : `${r.workOrderId.slice(0, 8)}...`}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{r.workOrder?.karigar?.name}</td>
                    <td className="px-6 py-4 text-slate-600">{r.items?.length || 0} items</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{r.notes || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveReceiptId(r.id);
                            setIsReceiptOpen(true);
                          }}
                          title="View Receipt"
                          className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const kId = r.workOrder?.karigar?.id;
                              if (!kId) return;
                              const histRes = await api.get(`/karigars/${kId}/history`);
                              const hist = histRes.data;

                              const getPendingBalance = (productId: string) => {
                                if (!hist || !hist.workOrders) return 0;
                                let balance = 0;
                                hist.workOrders.forEach((wo: any) => {
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

                              const phone = r.workOrder?.karigar?.phone || '';
                              const name = r.workOrder?.karigar?.name || '';
                              const cleanedPhone = phone.replace(/\D/g, '');
                              const targetPhone = cleanedPhone.startsWith('0') ? '91' + cleanedPhone.slice(1) : (cleanedPhone.length === 10 ? '91' + cleanedPhone : cleanedPhone);
                              const dateStr = new Date(r.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              });
                              const receiptNo = r.id ? (r.id.startsWith('RO-') ? r.id : `REC-${r.id.slice(0, 8).toUpperCase()}`) : 'TEMP';

                              let message = `*Receipt Order:* ${receiptNo}\n`;
                              message += `*SHABAB ZARI ART*\n`;
                              message += `*Date:* ${dateStr}\n\n`;
                              message += `*Received Items:*\n`;

                              (r.items || []).forEach((item: any, index: number) => {
                                const prodName = item.workOrderItem?.product?.name || 'Product';
                                const prodType = item.workOrderItem?.product?.type || '';
                                const pId = item.workOrderItem?.productId;
                                const remainingBalance = pId ? getPendingBalance(pId) : 0;

                                message += `${index + 1}. *${prodName} (${prodType})*\n`;
                                message += `   - Receive (प्राप्त): ${item.quantity}\n`;
                                message += `   - Balance: ${remainingBalance}\n\n`;
                              });

                              if (r.notes) {
                                message += `*Notes:* ${r.notes}\n\n`;
                              }

                              message += `Thank you for your hard work!`;
                              window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`, '_blank');
                            } catch (err) {
                              alert('Failed to generate WhatsApp message');
                            }
                          }}
                          title="Send WhatsApp Receipt"
                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.007 14.113.987 11.48.987 6.046.987 1.62 5.358 1.616 10.787c-.001 1.706.452 3.372 1.31 4.868l-.995 3.635 3.726-.976zm11.233-6.006c-.3-.15-1.774-.875-2.048-.976-.276-.1-.476-.15-.676.15-.2.3-.775.976-.95 1.176-.175.2-.35.225-.65.075-.301-.15-1.267-.467-2.413-1.49-1.01-.902-1.686-2.016-1.886-2.36-.2-.35-.021-.539.129-.688.136-.135.301-.35.451-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.628-.926-2.228-.244-.589-.493-.51-.676-.519-.174-.009-.374-.01-.574-.01-.2 0-.526.075-.801.374-.275.3-.1.776-.1 1.947 0 1.17.85 2.3.975 2.474.125.175 1.673 2.553 4.053 3.58.566.244 1.008.39 1.353.499.569.18 1.085.155 1.493.094.455-.068 1.399-.571 1.599-1.122.2-.55.2-1.02.14-1.122-.06-.1-.23-.15-.53-.3z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200">
          <p className="text-sm text-slate-500">Total: {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <span className="px-3 py-1 text-sm">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={receipts.length < 10} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Record Receipt</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Karigar *</label>
                  <select required value={selectedKarigarId} onChange={(e) => selectKarigar(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="">Select Karigar</option>
                    {(() => {
                      const uniqueWOs: any[] = [];
                      const seenIds = new Set();
                      workOrders.forEach(wo => {
                        if (!seenIds.has(wo.id)) {
                          seenIds.add(wo.id);
                          uniqueWOs.push(wo);
                        }
                      });

                      const uniqueKarigarsMap = new Map();
                      uniqueWOs.forEach(wo => {
                        if (wo.karigar && wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED') {
                          const kid = wo.karigar.id;
                          if (!uniqueKarigarsMap.has(kid)) {
                            uniqueKarigarsMap.set(kid, {
                              karigarId: kid,
                              karigarName: wo.karigar.name,
                              workOrdersCount: 0
                            });
                          }
                          uniqueKarigarsMap.get(kid).workOrdersCount += 1;
                        }
                      });
                      return Array.from(uniqueKarigarsMap.values()).map(k => (
                        <option key={k.karigarId} value={k.karigarId}>
                          {k.karigarName} - Pending Orders ({k.workOrdersCount})
                        </option>
                      ));
                    })()}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg outline-none" />
              </div>

              {receiptItems.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Items to Receive</label>
                  <div className="space-y-2">
                    {receiptItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-slate-500">Assigned: {item.assignedQty} | Already Received: {item.receivedQty}</p>
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            max={item.assignedQty - item.receivedQty}
                            value={item.quantity}
                            onChange={(e) => updateReceiptItem(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm outline-none"
                            placeholder="Qty"
                          />
                        </div>
                        <div className="w-40">
                          <input
                            type="text"
                            value={item.qualityNotes}
                            onChange={(e) => updateReceiptItem(idx, 'qualityNotes', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm outline-none"
                            placeholder="Quality notes"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Save Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Goods Received Receipt Modal */}
      <GoodsReceivedReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setActiveReceiptId(null);
        }}
        receiptId={activeReceiptId}
      />
    </div>
  );
}

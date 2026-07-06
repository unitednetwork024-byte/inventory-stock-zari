'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, X, Trash2, Eye, Package } from 'lucide-react';

interface WorkOrderItem {
  productId: string;
  quantity: number;
  ratePerPiece: number;
  product?: { id: string; name: string; type: string };
}

export default function WorkOrdersPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'balance'>('orders');
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [karigars, setKarigars] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ karigarId: '', deadline: '', notes: '' });
  const [items, setItems] = useState<WorkOrderItem[]>([{ productId: '', quantity: 1, ratePerPiece: 0 }]);

  // Suit Balance state
  const [balanceData, setBalanceData] = useState<any[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/work-orders?${params}`);
      setWorkOrders(res.data.data);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSuitBalance = async () => {
    setBalanceLoading(true);
    try {
      const res = await api.get('/work-orders/suit-balance');
      setBalanceData(res.data.data);
    } catch (err) { console.error(err); }
    finally { setBalanceLoading(false); }
  };

  useEffect(() => { fetchWorkOrders(); }, [page, statusFilter]);

  useEffect(() => {
    api.get('/karigars?limit=100').then(r => setKarigars(r.data.data)).catch(() => {});
    api.get('/products/all').then(r => setProducts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'balance') fetchSuitBalance();
  }, [activeTab]);

  const openCreate = () => {
    setForm({ karigarId: '', deadline: '', notes: '' });
    setItems([{ productId: '', quantity: 1, ratePerPiece: 0 }]);
    setShowModal(true);
  };

  const addItem = () => setItems([...items, { productId: '', quantity: 1, ratePerPiece: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.karigarId) return alert('Select a karigar');
    if (items.some(i => !i.productId)) return alert('Select products for all items');
    try {
      // 1. Fetch the karigar's history to calculate previous pending balances
      const historyRes = await api.get(`/karigars/${form.karigarId}/history`);
      const pastOrders = historyRes.data.workOrders || [];
      const karigar = karigars.find(k => k.id === form.karigarId);
      
      // Calculate balances for each item before saving
      const itemsWithBalances = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        
        let prevBalance = 0;
        pastOrders.forEach((wo: any) => {
          if (wo.status !== 'CANCELLED') {
            (wo.items || []).forEach((woItem: any) => {
              if (woItem.productId === item.productId) {
                prevBalance += (woItem.quantity - (woItem.receivedQty || 0));
              }
            });
          }
        });
        
        const addedToday = Number(item.quantity);
        const newTotalBalance = prevBalance + addedToday;
        
        return {
          productName: product ? `${product.name} (${product.type})` : 'Product',
          prevBalance,
          addedToday,
          newTotalBalance
        };
      });

      // 2. Save the new work order
      await api.post('/work-orders', {
        ...form,
        items: items.map(i => ({ productId: i.productId, quantity: Number(i.quantity), ratePerPiece: Number(i.ratePerPiece) })),
      });
      
      setShowModal(false);
      fetchWorkOrders();

      // 3. Construct and open the WhatsApp link
      if (karigar && karigar.phone) {
        const dateStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
        
        let message = `*Zari Inventory Management*\n`;
        message += `*New Work Order Created*\n\n`;
        message += `*Karigar:* ${karigar.name}\n`;
        message += `*Date:* ${dateStr}\n`;
        if (form.deadline) {
          const deadlineDate = new Date(form.deadline).toLocaleDateString('en-GB');
          message += `*Deadline:* ${deadlineDate}\n`;
        }
        message += `\n*Suit Balance Details:*\n`;
        
        itemsWithBalances.forEach((item, index) => {
          message += `${index + 1}. *${item.productName}*\n`;
          message += `   - Previous Balance: ${item.prevBalance}\n`;
          message += `   - Added Today: +${item.addedToday}\n`;
          message += `   - Total Balance: ${item.newTotalBalance}\n\n`;
        });
        
        if (form.notes) {
          message += `*Notes:* ${form.notes}\n\n`;
        }
        
        message += `Thank you!`;

        // Format phone
        let cleanedPhone = karigar.phone.replace(/\D/g, '');
        if (cleanedPhone.startsWith('0')) {
          cleanedPhone = '91' + cleanedPhone.slice(1);
        } else if (cleanedPhone.length === 10) {
          cleanedPhone = '91' + cleanedPhone;
        }

        const url = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this work order?')) return;
    try { await api.delete(`/work-orders/${id}`); fetchWorkOrders(); }
    catch { alert('Failed to delete'); }
  };

  const viewDetail = async (id: string) => {
    try {
      const res = await api.get(`/work-orders/${id}`);
      setShowDetail(res.data);
    } catch { alert('Failed to load details'); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'PARTIALLY_RECEIVED': return 'bg-orange-100 text-orange-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Work Orders</h1>
        <button onClick={openCreate} className="mt-3 sm:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
          <Plus size={18} /> New Work Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'orders' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          Work Orders
        </button>
        <button
          onClick={() => setActiveTab('balance')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'balance' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Package size={16} /> Suit Balance
        </button>
      </div>

      {/* WORK ORDERS TAB */}
      {activeTab === 'orders' && (
        <>
          {/* Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Karigar</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Items</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Deadline</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Created</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
                  ) : workOrders.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">No work orders</td></tr>
                  ) : (
                    workOrders.map((wo) => (
                      <tr key={wo.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-800">{wo.karigar?.name}</td>
                        <td className="px-6 py-4 text-slate-600">{wo.items?.length || 0} items</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>{wo.status?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{wo.deadline ? new Date(wo.deadline).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{new Date(wo.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => viewDetail(wo.id)} className="text-indigo-600 hover:text-indigo-800"><Eye size={16} /></button>
                            <button onClick={() => handleDelete(wo.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
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
                <button onClick={() => setPage(p => p + 1)} disabled={workOrders.length < 10} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SUIT BALANCE TAB */}
      {activeTab === 'balance' && (
        <>
          {/* Summary Cards */}
          {balanceData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Total Suits Assigned</p>
                <p className="text-2xl font-bold text-slate-800">{balanceData.reduce((s, b) => s + b.totalSuits, 0)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4">
                <p className="text-sm text-green-600">Completed / Received</p>
                <p className="text-2xl font-bold text-green-700">{balanceData.reduce((s, b) => s + b.receivedSuits, 0)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
                <p className="text-sm text-orange-600">Pending Suits</p>
                <p className="text-2xl font-bold text-orange-700">{balanceData.reduce((s, b) => s + b.pendingSuits, 0)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
                <p className="text-sm text-red-600">Total Due Amount</p>
                <p className="text-2xl font-bold text-red-700">Rs. {balanceData.reduce((s, b) => s + Math.max(0, b.dueAmount), 0).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Balance Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Karigar</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Total Suits</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-green-600 uppercase">Completed</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-orange-600 uppercase">Pending</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Rate/Piece</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Total Value</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-green-600 uppercase">Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-red-600 uppercase">Due Amount</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {balanceLoading ? (
                    <tr><td colSpan={10} className="text-center py-8 text-slate-400">Loading...</td></tr>
                  ) : balanceData.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-8 text-slate-400">No work orders found</td></tr>
                  ) : (
                    balanceData.map((row) => (
                      <tr key={row.workOrderId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.karigar?.name}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {row.items?.map((item: any, idx: number) => (
                            <span key={idx}>{idx > 0 ? ', ' : ''}{item.product?.name}</span>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-800">{row.totalSuits}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-green-700 font-medium">{row.receivedSuits}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${row.pendingSuits > 0 ? 'text-orange-700' : 'text-green-600'}`}>
                            {row.pendingSuits}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 text-sm">
                          {row.items?.length === 1 ? `Rs. ${row.items[0].ratePerPiece}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">Rs. {row.totalValue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-700">Rs. {row.totalPaid.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${row.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Rs. {Math.max(0, row.dueAmount).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                            {row.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Work Order</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Karigar *</label>
                  <select required value={form.karigarId} onChange={(e) => setForm({...form, karigarId: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="">Select Karigar</option>
                    {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg outline-none" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Items</label>
                  <button type="button" onClick={addItem} className="text-indigo-600 text-sm flex items-center gap-1"><Plus size={14} /> Add Item</button>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-end">
                    <div className="flex-1">
                      <select value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none">
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                      </select>
                    </div>
                    <div className="w-24">
                      <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none" />
                    </div>
                    <div className="w-28">
                      <input type="number" min="0" step="0.01" placeholder="Rate" value={item.ratePerPiece} onChange={(e) => updateItem(idx, 'ratePerPiece', e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none" />
                    </div>
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-500 p-2"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Create Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (() => {
        const totalSuits = showDetail.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0;
        const receivedSuits = showDetail.items?.reduce((s: number, i: any) => s + i.receivedQty, 0) ?? 0;
        const pendingSuits = totalSuits - receivedSuits;
        const totalValue = showDetail.items?.reduce((s: number, i: any) => s + i.quantity * i.ratePerPiece, 0) ?? 0;
        const totalPaid = showDetail.payments?.reduce((s: number, p: any) => s + p.amount, 0) ?? 0;
        const dueAmount = totalValue - totalPaid;
        return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Work Order — {showDetail.karigar?.name}</h2>
                <p className="text-sm text-slate-500">Created {new Date(showDetail.createdAt).toLocaleDateString()}{showDetail.deadline ? ` · Deadline ${new Date(showDetail.deadline).toLocaleDateString()}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(showDetail.status)}`}>{showDetail.status?.replace(/_/g, ' ')}</span>
                <button onClick={() => setShowDetail(null)} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Suit Balance Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Total Suits</p>
                  <p className="text-2xl font-bold text-slate-800">{totalSuits}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{receivedSuits}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${pendingSuits > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                  <p className={`text-xs mb-1 ${pendingSuits > 0 ? 'text-orange-600' : 'text-green-600'}`}>Pending Suits</p>
                  <p className={`text-2xl font-bold ${pendingSuits > 0 ? 'text-orange-700' : 'text-green-700'}`}>{pendingSuits}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 mb-1">Total Value</p>
                  <p className="text-lg font-bold text-blue-700">Rs. {totalValue.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 mb-1">Paid to Karigar</p>
                  <p className="text-lg font-bold text-green-700">Rs. {totalPaid.toLocaleString()}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${dueAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-xs mb-1 ${dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>Due Amount</p>
                  <p className={`text-lg font-bold ${dueAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>Rs. {Math.max(0, dueAmount).toLocaleString()}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Items</h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase">Product</th>
                        <th className="text-center px-3 py-2 text-xs text-slate-500 uppercase">Assigned</th>
                        <th className="text-center px-3 py-2 text-xs text-green-600 uppercase">Received</th>
                        <th className="text-center px-3 py-2 text-xs text-orange-600 uppercase">Pending</th>
                        <th className="text-right px-3 py-2 text-xs text-slate-500 uppercase">Rate</th>
                        <th className="text-right px-3 py-2 text-xs text-slate-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {showDetail.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-medium">{item.product?.name}</td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-center text-green-600 font-medium">{item.receivedQty}</td>
                          <td className={`px-3 py-2 text-center font-semibold ${item.quantity - item.receivedQty > 0 ? 'text-orange-600' : 'text-green-600'}`}>{item.quantity - item.receivedQty}</td>
                          <td className="px-3 py-2 text-right text-slate-500">Rs. {item.ratePerPiece}</td>
                          <td className="px-3 py-2 text-right font-medium">Rs. {(item.quantity * item.ratePerPiece).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receipts */}
              {showDetail.receipts?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Receipts ({showDetail.receipts.length})</h3>
                  <div className="space-y-2">
                    {showDetail.receipts.map((r: any) => (
                      <div key={r.id} className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-3 text-sm">
                        <span className="text-green-600 font-medium">{new Date(r.date).toLocaleDateString()}</span>
                        {r.items?.map((ri: any, idx: number) => (
                          <span key={idx} className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{ri.quantity} × {ri.workOrderItem?.product?.name}</span>
                        ))}
                        {r.notes && <span className="text-slate-500 italic">{r.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              {showDetail.payments?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Payment History</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50"><tr>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase">Date</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase">Type</th>
                        <th className="text-right px-3 py-2 text-xs text-slate-500 uppercase">Amount</th>
                        <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase">Notes</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {showDetail.payments.map((p: any) => (
                          <tr key={p.id}>
                            <td className="px-3 py-2 text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'ADVANCE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{p.type}</span></td>
                            <td className="px-3 py-2 text-right font-semibold text-green-700">Rs. {p.amount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-slate-500 italic text-xs">{p.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {showDetail.notes && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 italic">Notes: {showDetail.notes}</div>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Search, Edit2, Trash2, X, History, CheckCircle, Clock, CreditCard, Package, FileText } from 'lucide-react';
import PaymentReceiptModal from '@/components/PaymentReceiptModal';
import GoodsReceivedReceiptModal from '@/components/GoodsReceivedReceiptModal';

interface Karigar {
  id: string;
  name: string;
  phone: string;
  address?: string;
  specialty?: string;
  status: string;
  _count?: { workOrders: number; payments: number };
}

export default function KarigarsPage() {
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKarigar, setEditingKarigar] = useState<Karigar | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', specialty: '', status: 'ACTIVE' });

  // History modal state
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<'orders' | 'payments'>('orders');

  // Receipt modal state
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Goods receipt modal state
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [isGoodsReceiptOpen, setIsGoodsReceiptOpen] = useState(false);

  const fetchKarigars = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/karigars?${params}`);
      setKarigars(res.data.data);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKarigars(); }, [page, statusFilter]);

  const handleSearch = () => { setPage(1); fetchKarigars(); };

  const openHistory = async (karigar: Karigar) => {
    setHistoryLoading(true);
    setHistoryData({ karigar, loading: true });
    setHistoryTab('orders');
    try {
      const res = await api.get(`/karigars/${karigar.id}/history`);
      setHistoryData(res.data);
    } catch { setHistoryData(null); alert('Failed to load history'); }
    finally { setHistoryLoading(false); }
  };
  const handleSendWhatsAppReceipt = (r: any, karigar: any) => {
    const phone = karigar?.phone || '';
    const name = karigar?.name || '';
    const cleanedPhone = phone.replace(/\D/g, '');
    const targetPhone = cleanedPhone.startsWith('0') ? '91' + cleanedPhone.slice(1) : (cleanedPhone.length === 10 ? '91' + cleanedPhone : cleanedPhone);
    const dateStr = new Date(r.date).toLocaleDateString();
    const receiptNo = `REC-${r.id ? r.id.slice(0, 8).toUpperCase() : 'TEMP'}`;
    const itemsList = (r.items || []).map((item: any) => '- ' + item.quantity + ' × ' + (item.workOrderItem?.product?.name || 'Product') + ' (' + (item.workOrderItem?.product?.type || '') + ')').join('\n');
    const notesStr = r.notes ? '*Notes:* ' + r.notes : '';
    const message = "*Zari Inventory Management*\n*Goods Received Receipt*\n\n*Receipt No:* " + receiptNo + "\n*Karigar:* " + name + "\n*Date:* " + dateStr + "\n\n*Received Items:*\n" + itemsList + "\n\n" + (notesStr ? notesStr + "\n" : "") + "Thank you for your hard work!";
    window.open("https://api.whatsapp.com/send?phone=" + targetPhone + "&text=" + encodeURIComponent(message), "_blank");
  };


  const openCreate = () => {
    setEditingKarigar(null);
    setForm({ name: '', phone: '', address: '', specialty: '', status: 'ACTIVE' });
    setShowModal(true);
  };

  const openEdit = (k: Karigar) => {
    setEditingKarigar(k);
    setForm({ name: k.name, phone: k.phone, address: k.address || '', specialty: k.specialty || '', status: k.status });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingKarigar) {
        await api.put(`/karigars/${editingKarigar.id}`, form);
      } else {
        await api.post('/karigars', form);
      }
      setShowModal(false);
      fetchKarigars();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this karigar?')) return;
    try {
      await api.delete(`/karigars/${id}`);
      fetchKarigars();
    } catch { alert('Failed to delete'); }
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
        <h1 className="text-2xl font-bold text-slate-800">Karigars</h1>
        <button onClick={openCreate} className="mt-3 sm:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
          <Plus size={18} /> Add Karigar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button onClick={handleSearch} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700">Search</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Phone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Specialty</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Orders</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : karigars.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No karigars found</td></tr>
              ) : (
                karigars.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <button onClick={() => openHistory(k)} className="font-medium text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1">
                        {k.name} <History size={13} className="opacity-60" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{k.phone}</td>
                    <td className="px-6 py-4 text-slate-600">{k.specialty || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${k.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{k.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{k._count?.workOrders || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(k)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(k.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
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
            <button onClick={() => setPage(p => p + 1)} disabled={karigars.length < 10} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* ── KARIGAR HISTORY MODAL ── */}
      {historyData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{historyData.karigar?.name}</h2>
                <p className="text-sm text-slate-500">{historyData.karigar?.phone} {historyData.karigar?.specialty ? `· ${historyData.karigar.specialty}` : ''}</p>
              </div>
              <button onClick={() => setHistoryData(null)} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
            </div>

            {historyLoading ? (
              <div className="py-16 text-center text-slate-400">Loading history...</div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 border-b border-slate-100">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <Package size={20} className="mx-auto mb-1 text-indigo-500" />
                    <p className="text-xs text-slate-500 mb-1">Total Suits</p>
                    <p className="text-2xl font-bold text-slate-800">{historyData.summary?.totalSuits ?? 0}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <CheckCircle size={20} className="mx-auto mb-1 text-green-600" />
                    <p className="text-xs text-green-600 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-700">{historyData.summary?.totalReceived ?? 0}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <Clock size={20} className="mx-auto mb-1 text-orange-500" />
                    <p className="text-xs text-orange-600 mb-1">Pending Suits</p>
                    <p className="text-2xl font-bold text-orange-700">{historyData.summary?.totalPending ?? 0}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <CreditCard size={20} className="mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-blue-600 mb-1">Total Value</p>
                    <p className="text-xl font-bold text-blue-700">Rs. {(historyData.summary?.totalValue ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <CreditCard size={20} className="mx-auto mb-1 text-green-600" />
                    <p className="text-xs text-green-600 mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-green-700">Rs. {(historyData.summary?.totalPaid ?? 0).toLocaleString()}</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center ${historyData.summary?.dueAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <CreditCard size={20} className={`mx-auto mb-1 ${historyData.summary?.dueAmount > 0 ? 'text-red-500' : 'text-green-500'}`} />
                    <p className={`text-xs mb-1 ${historyData.summary?.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>Due Amount</p>
                    <p className={`text-xl font-bold ${historyData.summary?.dueAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      Rs. {Math.max(0, historyData.summary?.dueAmount ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mx-6 mt-4 mb-0 bg-slate-100 rounded-lg p-1 w-fit">
                  <button onClick={() => setHistoryTab('orders')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${historyTab === 'orders' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
                    Work Orders ({historyData.workOrders?.length ?? 0})
                  </button>
                  <button onClick={() => setHistoryTab('payments')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${historyTab === 'payments' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
                    Payments ({historyData.payments?.length ?? 0})
                  </button>
                </div>

                <div className="p-6 pt-4 max-h-[50vh] overflow-y-auto">
                  {/* WORK ORDERS TAB */}
                  {historyTab === 'orders' && (
                    <div className="space-y-4">
                      {(historyData.workOrders ?? []).length === 0 ? (
                        <p className="text-slate-400 text-center py-6">No work orders yet</p>
                      ) : (
                        historyData.workOrders.map((wo: any) => (
                          <div key={wo.id} className="border border-slate-200 rounded-xl overflow-hidden">
                            {/* Work order header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                                  {wo.status?.replace(/_/g, ' ')}
                                </span>
                                <span className="text-sm text-slate-500">{new Date(wo.createdAt).toLocaleDateString()}</span>
                                {wo.deadline && <span className="text-xs text-slate-400">Deadline: {new Date(wo.deadline).toLocaleDateString()}</span>}
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-slate-600"><b>{wo.totalSuits}</b> suits</span>
                                <span className="text-indigo-600 font-medium">Rs. {wo.totalAmount?.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Items table */}
                            <div className="px-4 py-2">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100 text-slate-400 text-xs">
                                    <th className="text-left py-2 font-medium">Product</th>
                                    <th className="text-center py-2 font-medium">Total Qty</th>
                                    <th className="text-center py-2 font-medium">Received Qty</th>
                                    <th className="text-center py-2 font-medium">Remaining</th>
                                    <th className="text-right py-2 font-medium">Rate</th>
                                    <th className="text-right py-2 font-medium">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {wo.items?.map((item: any) => (
                                    <tr key={item.id} className="border-b border-slate-50">
                                      <td className="py-2 font-medium">{item.product?.name} <span className="text-xs text-slate-400">({item.product?.type})</span></td>
                                      <td className="text-center py-2">{item.quantity}</td>
                                      <td className="text-center py-2 text-green-600">{item.receivedQty}</td>
                                      <td className={`text-center py-2 font-semibold ${item.quantity - item.receivedQty > 0 ? 'text-orange-600' : 'text-green-600'}`}>{item.quantity - item.receivedQty}</td>
                                      <td className="text-right py-2 text-slate-500">Rs. {item.ratePerPiece}</td>
                                      <td className="text-right py-2 font-medium">Rs. {(item.quantity * item.ratePerPiece).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Receipts */}
                            {wo.receipts?.length > 0 && (
                              <div className="px-4 pb-3 pt-1 bg-green-50/40 border-t border-slate-100">
                                <p className="text-xs text-green-700 font-medium mb-1.5">Receipts ({wo.receipts.length})</p>
                                <div className="space-y-1.5">
                                  {wo.receipts.map((r: any) => (
                                    <div key={r.id} className="text-xs text-slate-600 flex items-center justify-between py-1 border-b border-green-100/50 last:border-b-0 last:pb-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <CheckCircle size={12} className="text-green-500 shrink-0" />
                                        <span className="font-medium">{new Date(r.date).toLocaleDateString()}</span>
                                        {r.items?.map((ri: any, idx: number) => (
                                          <span key={idx} className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                            {ri.quantity} × {ri.workOrderItem?.product?.name || 'Product'}
                                          </span>
                                        ))}
                                        {r.notes && <span className="text-slate-400 italic">({r.notes})</span>}
                                      </div>
                                      <div className="flex items-center gap-1 ml-4 shrink-0">
                                        <button
                                          onClick={() => {
                                            setActiveReceiptId(r.id);
                                            setIsGoodsReceiptOpen(true);
                                          }}
                                          title="View/Print Receipt"
                                          className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                                        >
                                          <FileText size={13} />
                                        </button>
                                        <button
                                          onClick={() => handleSendWhatsAppReceipt(r, historyData.karigar)}
                                          title="Send WhatsApp Receipt"
                                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                        >
                                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.007 14.113.987 11.48.987 6.046.987 1.62 5.358 1.616 10.787c-.001 1.706.452 3.372 1.31 4.868l-.995 3.635 3.726-.976zm11.233-6.006c-.3-.15-1.774-.875-2.048-.976-.276-.1-.476-.15-.676.15-.2.3-.775.976-.95 1.176-.175.2-.35.225-.65.075-.301-.15-1.267-.467-2.413-1.49-1.01-.902-1.686-2.016-1.886-2.36-.2-.35-.021-.539.129-.688.136-.135.301-.35.451-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.628-.926-2.228-.244-.589-.493-.51-.676-.519-.174-.009-.374-.01-.574-.01-.2 0-.526.075-.801.374-.275.3-.1.776-.1 1.947 0 1.17.85 2.3.975 2.474.125.175 1.673 2.553 4.053 3.58.566.244 1.008.39 1.353.499.569.18 1.085.155 1.493.094.455-.068 1.399-.571 1.599-1.122.2-.55.2-1.02.14-1.122-.06-.1-.23-.15-.53-.3z"/>
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* PAYMENTS TAB */}
                  {historyTab === 'payments' && (
                    <div>
                      {(historyData.payments ?? []).length === 0 ? (
                        <p className="text-slate-400 text-center py-6">No payments yet</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase">Date</th>
                              <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase">Type</th>
                              <th className="text-right px-3 py-2 text-xs text-slate-500 uppercase">Amount</th>
                              <th className="text-left px-3 py-2 text-xs text-slate-500 uppercase">Notes</th>
                              <th className="text-center px-3 py-2 text-xs text-slate-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {historyData.payments.map((p: any) => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="px-3 py-3 text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.type === 'ADVANCE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{p.type}</span>
                                </td>
                                <td className="px-3 py-3 text-right font-semibold text-green-700">Rs. {p.amount.toLocaleString()}</td>
                                <td className="px-3 py-3 text-slate-500 italic text-xs">{p.notes || '-'}</td>
                                <td className="px-3 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setActiveReceiptPayment(p);
                                        setIsReceiptOpen(true);
                                      }}
                                      title="View Receipt"
                                      className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                                    >
                                      <FileText size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const phone = historyData.karigar?.phone || '';
                                        const name = historyData.karigar?.name || '';
                                        const cleanedPhone = phone.replace(/\D/g, '');
                                        const targetPhone = cleanedPhone.startsWith('0') ? '91' + cleanedPhone.slice(1) : (cleanedPhone.length === 10 ? '91' + cleanedPhone : cleanedPhone);
                                        const dateStr = new Date(p.date).toLocaleDateString();
                                        const typeStr = p.type === 'ADVANCE' ? 'ADVANCE PAYMENT' : 'PAYMENT';
                                        const receiptNo = `PAY-${p.id ? p.id.slice(0, 8).toUpperCase() : 'TEMP'}`;
                                        const notesStr = p.notes ? `*Notes:* ${p.notes}` : '';
                                        const message = `*Zari Inventory Management*\n*Payment Receipt*\n\n*Receipt No:* ${receiptNo}\n*Karigar:* ${name}\n*Date:* ${dateStr}\n*Type:* ${typeStr}\n*Amount:* Rs. ${p.amount.toLocaleString()}\n${notesStr ? `${notesStr}\n` : ''}\nThank you for your service!`;
                                        window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`, '_blank');
                                      }}
                                      title="Send WhatsApp Receipt"
                                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                    >
                                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.007 14.113.987 11.48.987 6.046.987 1.62 5.358 1.616 10.787c-.001 1.706.452 3.372 1.31 4.868l-.995 3.635 3.726-.976zm11.233-6.006c-.3-.15-1.774-.875-2.048-.976-.276-.1-.476-.15-.676.15-.2.3-.775.976-.95 1.176-.175.2-.35.225-.65.075-.301-.15-1.267-.467-2.413-1.49-1.01-.902-1.686-2.016-1.886-2.36-.2-.35-.021-.539.129-.688.136-.135.301-.35.451-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.628-.926-2.228-.244-.589-.493-.51-.676-.519-.174-.009-.374-.01-.574-.01-.2 0-.526.075-.801.374-.275.3-.1.776-.1 1.947 0 1.17.85 2.3.975 2.474.125.175 1.673 2.553 4.053 3.58.566.244 1.008.39 1.353.499.569.18 1.085.155 1.493.094.455-.068 1.399-.571 1.599-1.122.2-.55.2-1.02.14-1.122-.06-.1-.23-.15-.53-.3z"/>
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-semibold">
                              <td colSpan={2} className="px-3 py-2 text-slate-700">Total Paid</td>
                              <td className="px-3 py-2 text-right text-green-700">Rs. {(historyData.summary?.totalPaid ?? 0).toLocaleString()}</td>
                              <td></td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Karigar Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingKarigar ? 'Edit' : 'Add'} Karigar</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <input required value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
                <input value={form.specialty} onChange={(e) => setForm({...form, specialty: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setActiveReceiptPayment(null);
        }}
        payment={activeReceiptPayment}
        karigar={historyData?.karigar}
      />
      {/* Goods Received Receipt Modal */}
      <GoodsReceivedReceiptModal
        isOpen={isGoodsReceiptOpen}
        onClose={() => {
          setIsGoodsReceiptOpen(false);
          setActiveReceiptId(null);
        }}
        receiptId={activeReceiptId}
      />
    </div>
  );
}

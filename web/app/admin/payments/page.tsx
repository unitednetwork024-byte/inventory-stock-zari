'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, X, Trash2, FileText } from 'lucide-react';
import PaymentReceiptModal from '@/components/PaymentReceiptModal';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [karigarFilter, setKarigarFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [karigars, setKarigars] = useState<any[]>([]);
  const [form, setForm] = useState({ karigarId: '', amount: '', type: 'PAYMENT', date: '', notes: '' });
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (karigarFilter) params.append('karigarId', karigarFilter);
      if (typeFilter) params.append('type', typeFilter);
      const res = await api.get(`/payments?${params}`);
      setPayments(res.data.data);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayments(); }, [page, karigarFilter, typeFilter]);

  useEffect(() => {
    api.get('/karigars?limit=100').then(r => setKarigars(r.data.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ karigarId: '', amount: '', type: 'PAYMENT', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.karigarId || !form.amount) return alert('Fill required fields');
    try {
      const res = await api.post('/payments', form);
      setShowModal(false);
      fetchPayments();
      // Auto open receipt modal for print/share
      setActiveReceiptPayment(res.data);
      setIsReceiptOpen(true);
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment?')) return;
    try { await api.delete(`/payments/${id}`); fetchPayments(); }
    catch { alert('Failed to delete'); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <button onClick={openCreate} className="mt-3 sm:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
          <Plus size={18} /> Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={karigarFilter} onChange={(e) => setKarigarFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none">
            <option value="">All Karigars</option>
            {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none">
            <option value="">All Types</option>
            <option value="PAYMENT">Payment</option>
            <option value="ADVANCE">Advance</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Karigar</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Notes</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No payments found</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{p.karigar?.name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">Rs. {p.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.type === 'PAYMENT' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{p.notes || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
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
                            const phone = p.karigar?.phone || '';
                            const name = p.karigar?.name || '';
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
                        <button onClick={() => handleDelete(p.id)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
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
            <button onClick={() => setPage(p => p + 1)} disabled={payments.length < 10} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Karigar *</label>
                <select required value={form.karigarId} onChange={(e) => setForm({...form, karigarId: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="">Select Karigar</option>
                  {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input type="number" required min="0" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="PAYMENT">Payment</option>
                  <option value="ADVANCE">Advance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg outline-none" />
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
      />
    </div>
  );
}

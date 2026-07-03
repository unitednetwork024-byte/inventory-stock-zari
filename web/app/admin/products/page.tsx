'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, X, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  type: string;
  description?: string;
  image?: string;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', type: 'SUIT', description: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      const res = await api.get(`/products?${params}`);
      setProducts(res.data.data);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [page, typeFilter]);

  const handleSearch = () => { setPage(1); fetchProducts(); };

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ name: '', type: 'SUIT', description: '' });
    setImageFile(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, type: p.type, description: p.description || '' });
    setImageFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('type', form.type);
      formData.append('description', form.description);
      if (imageFile) formData.append('image', imageFile);

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) { alert('Failed to delete'); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Products</h1>
        <button onClick={openCreate} className="mt-3 sm:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg outline-none">
            <option value="">All Types</option>
            <option value="SUIT">Suit</option>
            <option value="DUPATTA">Dupatta</option>
          </select>
          <button onClick={handleSearch} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700">Search</button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="col-span-full text-center py-8 text-slate-400">Loading...</p>
        ) : products.length === 0 ? (
          <p className="col-span-full text-center py-8 text-slate-400">No products found</p>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="h-40 bg-slate-100 flex items-center justify-center">
                {p.image ? (
                  <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${p.image}`} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="text-slate-300" size={48} />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-800">{p.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.type === 'SUIT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {p.type}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-3">{p.description || 'No description'}</p>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"><Edit2 size={14} /> Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingProduct ? 'Edit' : 'Add'} Product</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="SUIT">Suit</option>
                  <option value="DUPATTA">Dupatta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 border rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

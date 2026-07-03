'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Users, ClipboardList, CreditCard, TrendingUp, Package, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalKarigars: number;
  activeKarigars: number;
  totalWorkOrders: number;
  activeWorkOrders: number;
  pendingWorkOrders: number;
  completedWorkOrders: number;
  totalWorkValue: number;
  totalReceivedValue: number;
  totalPaid: number;
  totalAdvance: number;
  totalDue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/dashboard');
        setStats(res.data.stats);
        setRecentOrders(res.data.recentWorkOrders);
        setRecentPayments(res.data.recentPayments);
      } catch (err) {
        console.error('Failed to fetch dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Karigars', value: stats?.totalKarigars || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Work Orders', value: stats?.activeWorkOrders || 0, icon: ClipboardList, color: 'bg-green-500' },
    { label: 'Total Due Amount', value: `Rs. ${(stats?.totalDue || 0).toLocaleString()}`, icon: CreditCard, color: 'bg-red-500' },
    { label: 'Total Work Value', value: `Rs. ${(stats?.totalWorkValue || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Pending Orders', value: stats?.pendingWorkOrders || 0, icon: AlertCircle, color: 'bg-yellow-500' },
    { label: 'Completed Orders', value: stats?.completedWorkOrders || 0, icon: Package, color: 'bg-emerald-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Work Orders</h2>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-slate-400 text-sm">No work orders yet</p>
            ) : (
              recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-700">{order.karigar?.name}</p>
                    <p className="text-sm text-slate-500">{order.items?.length || 0} items</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status?.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {recentPayments.length === 0 ? (
              <p className="text-slate-400 text-sm">No payments yet</p>
            ) : (
              recentPayments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-700">{payment.karigar?.name}</p>
                    <p className="text-sm text-slate-500">{new Date(payment.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">Rs. {payment.amount.toLocaleString()}</p>
                    <span className={`text-xs font-medium ${payment.type === 'PAYMENT' ? 'text-green-600' : 'text-orange-600'}`}>
                      {payment.type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

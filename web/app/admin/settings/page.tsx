'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import {
  Database,
  KeyRound,
  Download,
  Upload,
  Trash2,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type Tab = 'database' | 'security';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('database');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset state
  const [confirmResetText, setConfirmResetText] = useState('');

  // File input ref for restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearMessages = () => {
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/settings/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccessMsg(res.data.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    clearMessages();
    setLoading(true);
    try {
      const res = await api.get('/settings/backup');
      const jsonString = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zari-inventory-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg('Backup downloaded successfully!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to generate backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Warning: Restoring data will overwrite all existing Karigars, Products, Work Orders, Payments, and Receipts. Are you sure you want to continue?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await api.post('/settings/restore', json);
        setSuccessMsg(res.data.message || 'Database restored successfully!');
      } catch (err: any) {
        setErrorMsg(err.response?.data?.error || 'Failed to restore. Please ensure the file is a valid backup JSON.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (confirmResetText !== 'RESET') {
      setErrorMsg('Please type RESET exactly to confirm');
      return;
    }

    if (!confirm('CRITICAL WARNING: This will permanently delete all records (Karigars, Products, Work Orders, Payments, Receipts) from the database! Users will be preserved. This cannot be undone. Are you absolutely sure?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/settings/reset', { confirmText: 'RESET' });
      setSuccessMsg(res.data.message || 'Database reset completed successfully.');
      setConfirmResetText('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your account security and database backups
          </p>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-3">
          <CheckCircle2 size={20} className="shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => {
            setActiveTab('database');
            clearMessages();
          }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'database'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Database size={16} />
          Database Backup & Reset
        </button>
        <button
          onClick={() => {
            setActiveTab('security');
            clearMessages();
          }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <KeyRound size={16} />
          Security & Password
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <span className="text-sm font-medium text-slate-600">Processing operation...</span>
            </div>
          </div>
        )}

        <div className="relative">
          {/* TAB 1: Database Settings */}
          {activeTab === 'database' && (
            <div className="space-y-8 divide-y divide-slate-100">
              {/* Backup */}
              <div className="pb-6">
                <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2 mb-2">
                  <Download className="text-slate-500" size={20} />
                  Backup Database
                </h3>
                <p className="text-sm text-slate-500 mb-4 max-w-2xl">
                  Download all data in the system (including Karigars, products, work orders, payments, and receipts) as a JSON backup file. This file can be used to restore the system status at any time.
                </p>
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download size={18} />
                  Download Backup File
                </button>
              </div>

              {/* Restore */}
              <div className="py-6">
                <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2 mb-2">
                  <Upload className="text-slate-500" size={20} />
                  Restore Database
                </h3>
                <p className="text-sm text-slate-500 mb-4 max-w-2xl text-justify">
                  Upload a previously downloaded JSON backup file to restore your database. 
                  <strong className="text-amber-600 block mt-1">
                    Warning: Restoring database will delete all current records and replace them with the records from the backup file.
                  </strong>
                </p>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Upload size={18} />
                    Choose Backup File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleRestore}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-400">Only accepts .json files generated by Zari Inventory Backup.</p>
                </div>
              </div>

              {/* Reset */}
              <div className="pt-6">
                <div className="bg-red-50/50 border border-red-100 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-red-800 flex items-center gap-2 mb-2">
                    <ShieldAlert className="text-red-600" size={20} />
                    Danger Zone: Reset All Data
                  </h3>
                  <p className="text-sm text-red-700 mb-5 max-w-2xl">
                    This action will permanently delete all Karigars, Products, Work Orders, Payments, and Receipts. The main user accounts will be kept. <strong>This action cannot be undone.</strong>
                  </p>

                  <form onSubmit={handleReset} className="max-w-md">
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">
                        Type <span className="underline font-bold">RESET</span> to confirm
                      </label>
                      <input
                        type="text"
                        placeholder="Type RESET"
                        value={confirmResetText}
                        onChange={(e) => setConfirmResetText(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-white border border-red-200 text-red-950 font-mono rounded-lg focus:ring-2 focus:ring-red-500 outline-none placeholder:text-red-300"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || confirmResetText !== 'RESET'}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                      Wipe All Database Data
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Change Password */}
          {activeTab === 'security' && (
            <div className="max-w-md">
              <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2 mb-4">
                <KeyRound className="text-slate-500" size={20} />
                Change Password
              </h3>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <KeyRound size={18} />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

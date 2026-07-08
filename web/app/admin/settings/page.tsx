'use client';

import { useState, useRef, useEffect } from 'react';
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
  AlertCircle,
  Cloud,
  FolderOpen,
  Settings2,
  RefreshCw,
  LogOut,
  FileJson,
  Link2,
  Unlink,
  Info
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

  // Google Drive state
  const [backupDest, setBackupDest] = useState<'local' | 'google'>('local');
  const [restoreSrc, setRestoreSrc] = useState<'local' | 'google'>('local');
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [gdriveToken, setGdriveToken] = useState<string>('');
  const [gdriveFiles, setGdriveFiles] = useState<any[]>([]);
  const [selectedGdriveFile, setSelectedGdriveFile] = useState<string>('');
  const [showClientIdInput, setShowClientIdInput] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Load Google Client ID and token on mount
  useEffect(() => {
    const savedClientId = localStorage.getItem('zari_gdrive_client_id') || '';
    setGoogleClientId(savedClientId);
    setClientIdInput(savedClientId);
    if (!savedClientId) {
      setShowClientIdInput(true);
    }

    const savedToken = localStorage.getItem('zari_gdrive_access_token') || '';
    if (savedToken) {
      setGdriveToken(savedToken);
    }
  }, []);

  const clearMessages = () => {
    setSuccessMsg('');
    setErrorMsg('');
  };

  const authenticateGoogle = (callback: (token: string) => void) => {
    if (!googleClientId) {
      // Simulated Demo Mode
      const mockToken = 'mock_token_demo_12345';
      setGdriveToken(mockToken);
      localStorage.setItem('zari_gdrive_access_token', mockToken);
      setSuccessMsg('Successfully connected to Google Drive (Simulated Demo Mode)!');
      callback(mockToken);
      return;
    }

    const win = window as any;
    if (!win.google || !win.google.accounts || !win.google.accounts.oauth2) {
      setErrorMsg('Google OAuth library is still loading or blocked. Please refresh the page and try again.');
      return;
    }

    try {
      const client = win.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            setErrorMsg(`Google authorization failed: ${response.error_description || response.error}`);
            return;
          }
          const token = response.access_token;
          setGdriveToken(token);
          localStorage.setItem('zari_gdrive_access_token', token);
          setSuccessMsg('Successfully connected to Google Drive!');
          callback(token);
        },
      });
      client.requestAccessToken();
    } catch (err: any) {
      setErrorMsg(`Failed to initialize Google Auth client: ${err.message}`);
    }
  };

  const handleSaveClientId = () => {
    clearMessages();
    const id = clientIdInput.trim();
    if (!id) {
      setErrorMsg('Client ID cannot be empty');
      return;
    }
    setGoogleClientId(id);
    localStorage.setItem('zari_gdrive_client_id', id);
    setShowClientIdInput(false);
    setSuccessMsg('Google Client ID saved successfully!');
  };

  const handleRemoveClientId = () => {
    clearMessages();
    if (confirm('Are you sure you want to remove the Google Client ID? This will sign you out of Google Drive.')) {
      setGoogleClientId('');
      setClientIdInput('');
      setGdriveToken('');
      localStorage.removeItem('zari_gdrive_client_id');
      localStorage.removeItem('zari_gdrive_access_token');
      setGdriveFiles([]);
      setSelectedGdriveFile('');
      setShowClientIdInput(true);
      setSuccessMsg('Google Client ID and credentials removed.');
    }
  };

  const handleDisconnectGdrive = () => {
    clearMessages();
    setGdriveToken('');
    localStorage.removeItem('zari_gdrive_access_token');
    setGdriveFiles([]);
    setSelectedGdriveFile('');
    setSuccessMsg('Disconnected from Google Drive.');
  };

  const handleGDriveBackup = async () => {
    clearMessages();
    if (!googleClientId && gdriveToken !== 'mock_token_demo_12345') {
      setErrorMsg('Please configure your Google Client ID first.');
      return;
    }

    const performUpload = async (token: string) => {
      setLoading(true);
      try {
        const res = await api.get('/settings/backup');
        
        const filename = `zari-inventory-backup-${new Date().toISOString().slice(0, 10)}.json`;

        if (token === 'mock_token_demo_12345') {
          // Simulated Demo Mode
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const simulatedFiles = JSON.parse(localStorage.getItem('zari_gdrive_mock_files') || '[]');
          const newFile = {
            id: 'mock_file_' + Date.now(),
            name: filename,
            createdTime: new Date().toISOString(),
            size: JSON.stringify(res.data).length,
            content: res.data,
          };
          simulatedFiles.unshift(newFile);
          localStorage.setItem('zari_gdrive_mock_files', JSON.stringify(simulatedFiles));
          setSuccessMsg(`Backup uploaded to Google Drive (Simulated) successfully! File name: ${filename}`);
          return;
        }

        const metadata = {
          name: filename,
          mimeType: 'application/json',
          description: 'Zari Inventory Management Database Backup',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' }));

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        });

        if (!uploadRes.ok) {
          if (uploadRes.status === 401) {
            setGdriveToken('');
            localStorage.removeItem('zari_gdrive_access_token');
            authenticateGoogle(performUpload);
            return;
          }
          const errData = await uploadRes.json();
          throw new Error(errData.error?.message || 'Failed to upload backup to Google Drive');
        }

        setSuccessMsg(`Backup uploaded to Google Drive successfully! File name: ${filename}`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to complete Google Drive backup.');
      } finally {
        setLoading(false);
      }
    };

    if (gdriveToken) {
      await performUpload(gdriveToken);
    } else {
      authenticateGoogle(performUpload);
    }
  };

  const fetchGDriveBackups = async (tokenToUse?: string) => {
    clearMessages();
    const token = tokenToUse || gdriveToken;
    if (!token) {
      authenticateGoogle((t) => fetchGDriveBackups(t));
      return;
    }

    setLoading(true);
    try {
      if (token === 'mock_token_demo_12345') {
        // Simulated Demo Mode
        await new Promise((resolve) => setTimeout(resolve, 800));
        const simulatedFiles = JSON.parse(localStorage.getItem('zari_gdrive_mock_files') || '[]');
        setGdriveFiles(simulatedFiles);
        if (simulatedFiles.length > 0) {
          setSelectedGdriveFile(simulatedFiles[0].id);
          setSuccessMsg(`Found ${simulatedFiles.length} backups in Google Drive (Simulated).`);
        } else {
          setSuccessMsg('No backups found in Google Drive (Simulated).');
        }
        return;
      }

      const q = encodeURIComponent("name contains 'zari-inventory-backup-' and name contains '.json' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setGdriveToken('');
          localStorage.removeItem('zari_gdrive_access_token');
          authenticateGoogle((t) => fetchGDriveBackups(t));
          return;
        }
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to fetch Google Drive backups.');
      }

      const data = await res.json();
      setGdriveFiles(data.files || []);
      if (data.files && data.files.length > 0) {
        setSelectedGdriveFile(data.files[0].id);
        setSuccessMsg(`Found ${data.files.length} backups in Google Drive.`);
      } else {
        setSuccessMsg('No backups found in Google Drive.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to list Google Drive backups.');
    } finally {
      setLoading(false);
    }
  };

  const handleGDriveRestore = async () => {
    clearMessages();
    if (!selectedGdriveFile) {
      setErrorMsg('Please select a backup file from Google Drive first.');
      return;
    }

    if (!confirm('Warning: Restoring data will overwrite all existing Karigars, Products, Work Orders, Payments, and Receipts. Are you sure you want to continue?')) {
      return;
    }

    const performRestore = async (token: string) => {
      setLoading(true);
      try {
        if (token === 'mock_token_demo_12345') {
          // Simulated Demo Mode
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const simulatedFiles = JSON.parse(localStorage.getItem('zari_gdrive_mock_files') || '[]');
          const file = simulatedFiles.find((f: any) => f.id === selectedGdriveFile);
          if (!file) {
            throw new Error('Selected backup file not found in simulated Drive.');
          }
          const restoreRes = await api.post('/settings/restore', file.content);
          setSuccessMsg(restoreRes.data.message || 'Database restored from Google Drive (Simulated) successfully!');
          return;
        }

        const url = `https://www.googleapis.com/drive/v3/files/${selectedGdriveFile}?alt=media`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            setGdriveToken('');
            localStorage.removeItem('zari_gdrive_access_token');
            authenticateGoogle(performRestore);
            return;
          }
          const errData = await res.json();
          throw new Error(errData.error?.message || 'Failed to download Google Drive backup.');
        }

        const json = await res.json();
        const restoreRes = await api.post('/settings/restore', json);
        setSuccessMsg(restoreRes.data.message || 'Database restored from Google Drive successfully!');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to restore. Please ensure the file is a valid backup JSON.');
      } finally {
        setLoading(false);
      }
    };

    if (gdriveToken) {
      await performRestore(gdriveToken);
    } else {
      authenticateGoogle(performRestore);
    }
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
                  Download all data in the system (including Karigars, products, work orders, payments, and receipts) as a JSON backup file or store it in your Google Drive.
                </p>

                {/* Destination Selector */}
                <div className="flex gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => { setBackupDest('local'); clearMessages(); }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      backupDest === 'local'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FolderOpen size={16} />
                    Local Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBackupDest('google'); clearMessages(); }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      backupDest === 'google'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Cloud size={16} />
                    Google Drive
                  </button>
                </div>

                {backupDest === 'local' ? (
                  <button
                    type="button"
                    onClick={handleBackup}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Download size={18} />
                    Download Backup File
                  </button>
                ) : (
                  <div className="space-y-4 max-w-2xl bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Settings2 size={16} className="text-slate-500" />
                        Google Drive Configuration
                      </h4>
                      {googleClientId && (
                        <button
                          type="button"
                          onClick={handleRemoveClientId}
                          className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Unlink size={12} />
                          Remove Credentials
                        </button>
                      )}
                    </div>

                    {gdriveToken ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-2">
                            {gdriveToken === 'mock_token_demo_12345' ? (
                              <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold py-1 px-2.5 bg-amber-50 rounded-lg border border-amber-200">
                                <CheckCircle2 size={16} />
                                Connected (Simulated Demo)
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-green-700 text-sm font-semibold py-1 px-2.5 bg-green-50 rounded-lg border border-green-200">
                                <CheckCircle2 size={16} />
                                Connected & Authorized
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleDisconnectGdrive}
                            className="text-slate-600 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <LogOut size={14} />
                            Disconnect
                          </button>
                        </div>

                        {googleClientId && (
                          <div className="text-xs text-slate-500 font-mono">
                            Client ID: {googleClientId.substring(0, 15)}...
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={handleGDriveBackup}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Cloud size={18} />
                            {gdriveToken === 'mock_token_demo_12345' ? 'Upload Backup (Simulated)' : 'Upload Backup to Google Drive'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Notice for Demo Mode */}
                        {!googleClientId && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex gap-2">
                            <Info size={16} className="shrink-0 text-amber-600 mt-0.5" />
                            <div>
                              <span className="font-semibold block mb-0.5">Simulated Cloud Storage Active</span>
                              No Google Client ID is configured. You can click <strong>Connect to Google Drive</strong> below to connect instantly in <strong>Simulated Demo Mode</strong> to try this feature immediately.
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => authenticateGoogle(() => {})}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Link2 size={16} />
                          {!googleClientId ? 'Connect to Google Drive (Simulated)' : 'Connect to Google Drive'}
                        </button>

                        <div className="pt-4 border-t border-slate-200">
                          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                            Google OAuth Client ID (Optional for Demo)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter client ID (e.g. xxxxx.apps.googleusercontent.com)"
                              value={clientIdInput}
                              onChange={(e) => setClientIdInput(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={handleSaveClientId}
                              className="bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">To use a real Google Account, configure your Client ID following the GCP steps below.</p>
                        </div>

                        <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50 text-xs text-indigo-950 leading-relaxed flex gap-2">
                          <Info size={16} className="shrink-0 text-indigo-600 mt-0.5" />
                          <div>
                            <p className="font-semibold mb-1">Setup Instructions (Real Account):</p>
                            <ol className="list-decimal pl-4 space-y-1">
                              <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800 font-semibold">Google Cloud Console</a>.</li>
                              <li>Enable <strong>Google Drive API</strong>.</li>
                              <li>Create an <strong>OAuth client ID</strong> for Web application.</li>
                              <li>Add <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono text-[10px]">http://localhost:3000</code> to <strong>Authorized JavaScript origins</strong>.</li>
                              <li>Paste the Client ID here and save.</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Restore */}
              <div className="py-6">
                <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2 mb-2">
                  <Upload className="text-slate-500" size={20} />
                  Restore Database
                </h3>
                <p className="text-sm text-slate-500 mb-4 max-w-2xl text-justify">
                  Upload a previously downloaded JSON backup file or restore one directly from your Google Drive.
                  <strong className="text-amber-600 block mt-1">
                    Warning: Restoring database will delete all current records and replace them with the records from the backup file.
                  </strong>
                </p>

                {/* Source Selector */}
                <div className="flex gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => { setRestoreSrc('local'); clearMessages(); }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      restoreSrc === 'local'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileJson size={16} />
                    Local File
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRestoreSrc('google'); clearMessages(); }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      restoreSrc === 'google'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Cloud size={16} />
                    Google Drive
                  </button>
                </div>

                {restoreSrc === 'local' ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
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
                ) : (
                  <div className="space-y-4 max-w-2xl bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {!googleClientId ? (
                      <p className="text-sm text-slate-500 italic">Please configure your Google Client ID under the Backup section first.</p>
                    ) : !gdriveToken ? (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-500">You must authorize Google Drive access to browse and restore backups.</p>
                        <button
                          type="button"
                          onClick={() => authenticateGoogle((t) => fetchGDriveBackups(t))}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors inline-block cursor-pointer"
                        >
                          <Link2 size={16} />
                          Authorize & Load Backups
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <FolderOpen size={16} className="text-slate-500" />
                            Google Drive Backups
                          </span>
                          <button
                            type="button"
                            onClick={() => fetchGDriveBackups()}
                            disabled={loading}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Refresh List
                          </button>
                        </div>

                        {gdriveFiles.length === 0 ? (
                          <div className="text-center py-4 bg-white rounded-lg border border-dashed border-slate-300">
                            <p className="text-sm text-slate-500 mb-2">No backups found in your Google Drive.</p>
                            <button
                              type="button"
                              onClick={() => fetchGDriveBackups()}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-md font-medium cursor-pointer"
                            >
                              Scan Drive
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                Select Backup File
                              </label>
                              <select
                                value={selectedGdriveFile}
                                onChange={(e) => setSelectedGdriveFile(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                {gdriveFiles.map((file) => {
                                  const formattedDate = new Date(file.createdTime).toLocaleString();
                                  const formattedSize = file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'unknown size';
                                  return (
                                    <option key={file.id} value={file.id}>
                                      {file.name} ({formattedDate}, {formattedSize})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={handleGDriveRestore}
                              disabled={loading || !selectedGdriveFile}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Upload size={18} />
                              Restore Selected Backup
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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

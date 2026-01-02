'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ApiKey {
  _id: string;
  name: string;
  key: string;
  remainingTokens: number;
  totalTokens: number;
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminPage() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({ key: '', totalTokens: 10000 });
  const [nextKeyNumber, setNextKeyNumber] = useState(41);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingQuota, setCheckingQuota] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', token }),
        });
        const data = await response.json();
        if (data.success && data.valid) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('adminToken');
        }
      } catch {
        localStorage.removeItem('adminToken');
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoginLoading(true);

    try {
      const response = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (data.success && data.token) {
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch {
      setAuthError('Connection error');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', token }),
      });
    }
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  const fetchKeys = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/keys?page=${page}&limit=${pagination.limit}`);
      const data = await response.json();
      if (data.success) {
        setKeys(data.data);
        setPagination(data.pagination);

        // Calculate next key number based on existing keys
        const keyNumbers = data.data
          .map((k: ApiKey) => {
            const match = k.name.match(/^(\d+)$/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter((n: number) => n > 0);

        const maxNumber = keyNumbers.length > 0 ? Math.max(...keyNumbers) : 40;
        setNextKeyNumber(maxNumber + 1);
      }
    } catch (err) {
      setError('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchKeys();
    }
  }, [isAuthenticated, fetchKeys]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${nextKeyNumber}`,
          key: newKey.key,
          totalTokens: newKey.totalTokens
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewKey({ key: '', totalTokens: 10000 });
        setShowAddForm(false);
        setNextKeyNumber(nextKeyNumber + 1);
        fetchKeys(pagination.page);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to add API key');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      });

      if (response.ok) {
        fetchKeys(pagination.page);
      }
    } catch (err) {
      setError('Failed to update API key');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Delete this API key?')) return;

    try {
      const response = await fetch(`/api/keys?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchKeys(pagination.page);
      }
    } catch (err) {
      setError('Failed to delete API key');
    }
  };

  const handleCheckQuota = async (keyId: string, apiKey: string) => {
    setCheckingQuota(keyId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/check-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, apiKey }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchKeys(pagination.page);
        const statusMessage = data.data.remainingCharacters > 0
          ? `✓ Quota refreshed: ${data.data.remainingCharacters.toLocaleString()} / ${data.data.characterLimit.toLocaleString()} (${data.data.percentage}%) - Key reactivated`
          : `⚠ No remaining quota: 0 / ${data.data.characterLimit.toLocaleString()}`;
        setSuccess(statusMessage);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to check quota');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check quota');
    } finally {
      setCheckingQuota(null);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/check-all-quotas', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        await fetchKeys(pagination.page);

        const { successful, failed, results } = data.data;
        const activeKeys = results.filter((r: { success: boolean; remainingCharacters?: number }) => r.success && (r.remainingCharacters ?? 0) > 0).length;

        setSuccess(
          `✓ Refresh Complete! Total: ${data.data.total} | Successful: ${successful} | Failed: ${failed} | Active: ${activeKeys}` +
          (activeKeys > 0 ? ` - ${activeKeys} key(s) reactivated` : '')
        );
        setTimeout(() => setSuccess(''), 8000);
      } else {
        setError(data.error || 'Failed to refresh all quotas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh all quotas');
    } finally {
      setRefreshingAll(false);
    }
  };

  // Loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
              <p className="text-gray-500 mt-2">Enter password to continue</p>
            </div>

            <form onSubmit={handleLogin}>
              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{authError}</p>
                </div>
              )}

              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="••••••••••••"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
                ← Back to TTS
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">API Keys Management</h1>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Logout
              </button>
              <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Back to TTS
              </Link>
            </div>
          </div>

          {/* ElevenLabs Free Tier Info */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r">
            <div className="flex items-start gap-3">
              <div className="text-blue-500 text-2xl">ℹ️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">ElevenLabs Free Tier Limits</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>10,000 characters/month</strong> per API key (1 character = 1 token)</li>
                  <li>• Quota automatically resets at the start of each month (billing cycle)</li>
                  <li>• Use <strong>Refresh</strong> button to sync current quota from ElevenLabs</li>
                  <li>• Multiple keys = Multiple quotas (e.g., 3 keys = 30,000 chars/month)</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          <div className="mb-4 flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {showAddForm ? 'Cancel' : '+ Add API Key'}
            </button>
            <button
              onClick={handleRefreshAll}
              disabled={refreshingAll || keys.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Refresh quota for all API keys"
            >
              {refreshingAll ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  <span>Refreshing All...</span>
                </>
              ) : (
                <>
                  <span>⟳</span>
                  <span>Refresh All</span>
                </>
              )}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddKey} className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <div className="mb-3">
                <p className="text-sm text-green-800">
                  <strong>Adding Key {nextKeyNumber}</strong> - Just paste your ElevenLabs API key below
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ElevenLabs API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newKey.key}
                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono bg-white text-gray-900"
                    placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                >
                  ✓ Add Key {nextKeyNumber}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Default quota: 10,000 characters/month (Free tier)
              </p>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">API Key</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Token Usage</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{key.name}</span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {key.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-600">
                          {key.key.substring(0, 10)}...{key.key.substring(key.key.length - 4)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-gray-900">{key.remainingTokens.toLocaleString()}</span>
                            <span className="text-sm text-gray-500">/ {key.totalTokens.toLocaleString()}</span>
                            <span className="text-xs text-gray-400">chars</span>
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            {Math.round((key.remainingTokens / key.totalTokens) * 100)}% remaining
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${(key.remainingTokens / key.totalTokens) > 0.5 ? 'bg-green-500' :
                                (key.remainingTokens / key.totalTokens) > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${(key.remainingTokens / key.totalTokens) * 100}%` }}
                            ></div>
                          </div>
                          {key.lastUsed && (
                            <div className="text-xs text-gray-400 mt-1">
                              Last used: {new Date(key.lastUsed).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleCheckQuota(key._id, key.key)}
                            disabled={checkingQuota === key._id}
                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 disabled:opacity-50 text-sm flex items-center gap-1"
                            title="Refresh quota from ElevenLabs API"
                          >
                            {checkingQuota === key._id ? (
                              <>
                                <span className="inline-block animate-spin">⟳</span>
                                <span>Refreshing...</span>
                              </>
                            ) : (
                              <>
                                <span>⟳</span>
                                <span>Refresh</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleActive(key._id, key.isActive)}
                            className={`px-3 py-1 rounded text-sm ${key.isActive
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                          >
                            {key.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteKey(key._id)}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {keys.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No API keys found</p>
                </div>
              )}
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} keys
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchKeys(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === pagination.totalPages ||
                      (page >= pagination.page - 2 && page <= pagination.page + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => fetchKeys(page)}
                          className={`px-3 py-2 rounded ${page === pagination.page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === pagination.page - 3 ||
                      page === pagination.page + 3
                    ) {
                      return <span key={page} className="px-2 py-2">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => fetchKeys(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

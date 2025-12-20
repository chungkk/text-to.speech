'use client';

import { useState, useEffect } from 'react';
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
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({ name: '', key: '', totalTokens: 10000 });
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

  const fetchKeys = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/keys?page=${page}&limit=${pagination.limit}`);
      const data = await response.json();
      if (data.success) {
        setKeys(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      setError('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      });

      const data = await response.json();
      if (data.success) {
        setNewKey({ name: '', key: '', totalTokens: 10000 });
        setShowAddForm(false);
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
    } catch (err: any) {
      setError(err.message || 'Failed to check quota');
    } finally {
      setCheckingQuota(null);
    }
  };

  const handleRefreshAll = async () => {
    if (!confirm('Refresh quota for all API keys?')) return;
    
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
        const activeKeys = results.filter((r: any) => r.success && r.remainingCharacters > 0).length;
        
        setSuccess(
          `✓ Refresh Complete! Total: ${data.data.total} | Successful: ${successful} | Failed: ${failed} | Active: ${activeKeys}` +
          (activeKeys > 0 ? ` - ${activeKeys} key(s) reactivated` : '')
        );
        setTimeout(() => setSuccess(''), 8000);
      } else {
        setError(data.error || 'Failed to refresh all quotas');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh all quotas');
    } finally {
      setRefreshingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Back to TTS
            </Link>
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
            <form onSubmit={handleAddKey} className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Key name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="text"
                    value={newKey.key}
                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="sk_xxxxx"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Tokens</label>
                  <input
                    type="number"
                    value={newKey.totalTokens}
                    onChange={(e) => setNewKey({ ...newKey, totalTokens: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
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
                            className={`px-2 py-0.5 text-xs rounded ${
                              key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                          <div className="flex items-baseline gap-1">
                            <span className="font-semibold text-gray-900">{key.remainingTokens.toLocaleString()}</span>
                            <span className="text-sm text-gray-500">/ {key.totalTokens.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                (key.remainingTokens / key.totalTokens) > 0.5 ? 'bg-green-500' :
                                (key.remainingTokens / key.totalTokens) > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${(key.remainingTokens / key.totalTokens) * 100}%` }}
                            ></div>
                          </div>
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
                            className={`px-3 py-1 rounded text-sm ${
                              key.isActive
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
                          className={`px-3 py-2 rounded ${
                            page === pagination.page
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

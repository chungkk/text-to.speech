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

export default function AdminPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({ name: '', key: '', totalTokens: 10000 });
  const [error, setError] = useState('');
  const [checkingQuota, setCheckingQuota] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/keys');
      const data = await response.json();
      if (data.success) {
        setKeys(data.data);
      }
    } catch (err) {
      setError('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const getTotalStats = () => {
    const total = keys.reduce((acc, key) => acc + key.totalTokens, 0);
    const remaining = keys.reduce((acc, key) => acc + key.remainingTokens, 0);
    const used = total - remaining;
    const activeCount = keys.filter(k => k.isActive).length;
    return { total, remaining, used, activeCount, totalKeys: keys.length };
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
        fetchKeys();
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
        fetchKeys();
      }
    } catch (err) {
      setError('Failed to update API key');
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(`/api/keys?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchKeys();
      }
    } catch (err) {
      setError('Failed to delete API key');
    }
  };

  const handleCheckQuota = async (keyId: string, apiKey: string) => {
    setCheckingQuota(keyId);
    setError('');

    try {
      const response = await fetch('/api/check-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, apiKey }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh keys to show updated tokens
        await fetchKeys();
        alert(
          `✓ Quota Checked Successfully!\n\n` +
          `Character Limit: ${data.data.characterLimit.toLocaleString()}\n` +
          `Used: ${data.data.characterCount.toLocaleString()}\n` +
          `Remaining: ${data.data.remainingCharacters.toLocaleString()} (${data.data.percentage}%)\n\n` +
          `Database updated!`
        );
      } else {
        setError(data.error || 'Failed to check quota');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check quota');
    } finally {
      setCheckingQuota(null);
    }
  };

  const handleCheckAllQuotas = async () => {
    if (!confirm(`Check quota for all ${keys.length} API keys?\n\nThis may take a few seconds.`)) {
      return;
    }

    setCheckingAll(true);
    setError('');

    try {
      const response = await fetch('/api/check-all-quotas', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        await fetchKeys();
        
        const results = data.data.results;
        const successKeys = results.filter((r: any) => r.success);
        const failedKeys = results.filter((r: any) => !r.success);

        let message = `✓ Batch Check Completed!\n\n`;
        message += `Total: ${data.data.total}\n`;
        message += `Successful: ${data.data.successful}\n`;
        message += `Failed: ${data.data.failed}\n\n`;

        if (failedKeys.length > 0) {
          message += `Failed Keys:\n`;
          failedKeys.forEach((r: any) => {
            message += `  • ${r.name}: ${r.error}\n`;
          });
        }

        alert(message);
      } else {
        setError(data.error || 'Failed to check quotas');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check quotas');
    } finally {
      setCheckingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Keys Management</h1>
              <p className="text-gray-600 mt-2">Manage your ElevenLabs API keys</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to TTS
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Usage Stats */}
          {keys.length > 0 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium uppercase">Total Keys</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{getTotalStats().totalKeys}</p>
                <p className="text-xs text-blue-600 mt-1">{getTotalStats().activeCount} active</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs text-green-600 font-medium uppercase">Total Tokens</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{getTotalStats().total.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">characters/month</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-600 font-medium uppercase">Remaining</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{getTotalStats().remaining.toLocaleString()}</p>
                <p className="text-xs text-yellow-600 mt-1">{Math.round((getTotalStats().remaining / getTotalStats().total) * 100)}% available</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs text-red-600 font-medium uppercase">Used</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{getTotalStats().used.toLocaleString()}</p>
                <p className="text-xs text-red-600 mt-1">{Math.round((getTotalStats().used / getTotalStats().total) * 100)}% used</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-xs text-purple-600 font-medium uppercase">Est. Files</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{Math.floor(getTotalStats().remaining / 5000)}</p>
                <p className="text-xs text-purple-600 mt-1">~5000 chars/file</p>
              </div>
            </div>
          )}

          <div className="mb-6 flex gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {showAddForm ? 'Cancel' : '+ Add New API Key'}
            </button>
            {keys.length > 0 && (
              <button
                onClick={handleCheckAllQuotas}
                disabled={checkingAll}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {checkingAll ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Checking All Keys...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Check All Keys ({keys.length})
                  </>
                )}
              </button>
            )}
          </div>

          {showAddForm && (
            <form onSubmit={handleAddKey} className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add New API Key
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    className="w-full px-4 py-3 text-lg font-semibold text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all shadow-sm hover:border-gray-400 placeholder:text-gray-400 placeholder:font-normal"
                    placeholder="e.g., Production Key #1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={newKey.key}
                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                    className="w-full px-4 py-3 text-lg font-mono font-bold text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all shadow-sm hover:border-gray-400 placeholder:text-gray-400 placeholder:font-normal"
                    placeholder="sk_xxxxxxxxxxxxx"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Total Tokens (Characters/Month)
                  </label>
                  <input
                    type="number"
                    value={newKey.totalTokens}
                    onChange={(e) =>
                      setNewKey({ ...newKey, totalTokens: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-3 text-lg font-semibold text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all shadow-sm hover:border-gray-400 placeholder:text-gray-400 placeholder:font-normal"
                    placeholder="10000"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Key
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => (
                <div key={key._id} className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:border-blue-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{key.name}</h3>
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                            key.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {key.isActive ? '✓ Active' : '✕ Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Last used: {key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">API Key</p>
                      <p className="text-base font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-300">
                        {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Token Usage</p>
                        <span className="text-xs font-bold text-blue-600">
                          {Math.round((key.remainingTokens / key.totalTokens) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-2xl font-bold text-gray-900">{key.remainingTokens.toLocaleString()}</span>
                        <span className="text-sm text-gray-500">/ {key.totalTokens.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            (key.remainingTokens / key.totalTokens) > 0.5 ? 'bg-green-500' :
                            (key.remainingTokens / key.totalTokens) > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{
                            width: `${(key.remainingTokens / key.totalTokens) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap border-t border-gray-200 pt-4">
                          <button
                            onClick={() => handleCheckQuota(key._id, key.key)}
                            disabled={checkingQuota === key._id}
                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                            title="Check real quota from ElevenLabs"
                          >
                            {checkingQuota === key._id ? (
                              <>
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Checking
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                                Check
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleActive(key._id, key.isActive)}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                              key.isActive
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {key.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteKey(key._id)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                  </div>
                </div>
              ))}
              {keys.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <p className="text-lg font-semibold text-gray-600">No API keys found</p>
                  <p className="text-sm text-gray-500 mt-1">Add one to get started with text-to-speech</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

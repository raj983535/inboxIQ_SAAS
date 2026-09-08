'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AccountContext = createContext({
  data: null,
  loading: true,
  error: null,
  refreshAccount: async () => {},
  setData: () => {},
});

export function AccountProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccount = useCallback(async (showLoading = false) => {
    if (showLoading && !data) setLoading(true);
    try {
      const res = await fetch(`/api/account?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
        return json;
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error?.message || 'Failed to load account data.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    fetchAccount(true);
  }, []);

  return (
    <AccountContext.Provider
      value={{
        data,
        loading: loading && !data,
        initialLoading: loading,
        error,
        refreshAccount: () => fetchAccount(false),
        setData,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

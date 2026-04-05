// src/hooks/useApi.js
import axios from 'axios'
import { useState, useCallback } from 'react'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const call = useCallback(async (method, url, data = null, config = {}) => {
    setLoading(true); setError(null)
    try {
      const res = await api[method](url, data, config)
      return res.data
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Request failed'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading, error,
    get:    (url, cfg)        => call('get',    url, null, cfg),
    post:   (url, data, cfg)  => call('post',   url, data, cfg),
    delete: (url, cfg)        => call('delete', url, null, cfg),
  }
}

export default api

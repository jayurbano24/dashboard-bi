'use client';

import React, { useState } from 'react';

export default function ClaimsDashboard() {
  const [orderId, setOrderId] = useState('');
  const [manufacturer, setManufacturer] = useState('XIAOMI');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/claims/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, manufacturer })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({ error: 'Failed to generate claim' });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Claims Management Module</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Generate Claim</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Orderry ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <select 
            value={manufacturer} 
            onChange={(e) => setManufacturer(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="XIAOMI">Xiaomi</option>
            <option value="SAMSUNG">Samsung</option>
            <option value="MOTOROLA">Motorola</option>
          </select>
          <button 
            onClick={handleGenerate} 
            disabled={loading || !orderId}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Generate Claim'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold mb-2">Result</h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

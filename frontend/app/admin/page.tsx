"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { BACKEND_URL } from "@/lib/config";

export default function AdminPage() {
  const [activeTable, setActiveTable] = useState<string>("users");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // POST form states
  const [formData, setFormData] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [postMessage, setPostMessage] = useState("");

  const validTables = ["users", "folders", "documents", "document_chunks", "conversations", "messages", "feedback"];

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/db/${activeTable}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const resData = await response.json();
      if (resData.success) {
        setData(resData.data);
      } else {
        throw new Error("API returned failure");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTable]);

  const handlePost = async () => {
    setPostLoading(true);
    setPostMessage("");
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(formData);
      } catch (e) {
        throw new Error("Invalid JSON format for insert data");
      }

      const response = await fetch(`${BACKEND_URL}/api/db/${activeTable}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: parsedData })
      });

      if (!response.ok) throw new Error("Failed to insert data");
      
      setPostMessage("Row inserted successfully!");
      setFormData("");
      fetchData(); // refresh table
    } catch (err: any) {
      setPostMessage(`Error: ${err.message}`);
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <main className="flex h-screen bg-gray-50 dark:bg-[#000000] text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col p-6 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">Database Admin Panel</h1>
        
        {/* Table Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {validTables.map((table) => (
            <button 
              key={table}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTable === table ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-800"}`}
              onClick={() => setActiveTable(table)}
            >
              {table}
            </button>
          ))}
        </div>

        {/* Data View */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 mb-8 overflow-hidden flex flex-col" style={{maxHeight: '50vh'}}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Table: {activeTable}</h2>
            <button onClick={fetchData} className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded text-sm hover:bg-gray-200 dark:hover:bg-zinc-700">Refresh</button>
          </div>
          
          {loading ? (
            <p className="text-gray-500">Loading data...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : data.length === 0 ? (
            <p className="text-gray-500">No records found in {activeTable}.</p>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-zinc-900 shadow-sm z-10">
                  <tr>
                    {Object.keys(data[0]).map((col) => (
                      <th key={col} className="p-3 border-b border-gray-200 dark:border-gray-800 font-semibold">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      {Object.keys(data[0]).map((col) => (
                        <td key={col} className="p-3 border-b border-gray-100 dark:border-zinc-800/50 max-w-xs truncate">
                          {typeof row[col] === 'string' && (row[col].startsWith('{') || row[col].startsWith('[')) ? (
                            <span className="text-blue-500 text-xs bg-blue-500/10 px-2 py-1 rounded">JSON Data</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Insert Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Insert Row into {activeTable}</h2>
          <p className="text-sm text-gray-500 mb-4">Provide valid JSON where keys match table columns (e.g., `{"{"}"user_email": "test@test.com", "session_id": "123", ...{"}"}`). The backend will generate the auto-increment ID and created_at timestamp.</p>
          
          <textarea 
            value={formData}
            onChange={(e) => setFormData(e.target.value)}
            placeholder={`{\n  "column_name": "value"\n}`}
            className="w-full h-32 p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg font-mono text-sm mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={handlePost}
              disabled={postLoading || !formData.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {postLoading ? "Inserting..." : "Insert Row"}
            </button>
            {postMessage && (
              <span className={`text-sm ${postMessage.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                {postMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

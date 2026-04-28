import React from 'react';
import { SummaryData } from '../engine/solver';
import { items, machines } from '../engine/data';

interface DashboardProps {
  summary: SummaryData | null;
}

export function Dashboard({ summary }: DashboardProps) {
  if (!summary) return null;

  return (
    <div className="w-full h-full p-4 md:p-6 overflow-y-auto font-sans bg-[#2a343e] rounded-b-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Resources Panel */}
        <div className="flex flex-col gap-0 rounded shadow bg-[#34404c] border border-[#3f4d5a]">
          <div className="bg-[#3f4d5a] px-4 py-3 font-semibold text-[#f8fafc] flex items-center justify-between rounded-t">
            <div className="flex items-center gap-2">
              <span className="text-xl">💎</span>
              <span>Resources</span>
            </div>
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
          </div>
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-[#4d5c6b] bg-[#3c4956]">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-300">Used</th>
                  <th className="px-4 py-3 font-medium text-gray-300">Resource</th>
                  <th className="px-4 py-3 font-medium text-gray-300">Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4d5c6b]">
                {Object.entries(summary.rawInputs).map(([itemId, rate]) => (
                  <tr key={itemId} className="hover:bg-[#3f4d5a]/50 text-gray-200">
                    <td className="px-4 py-3 font-mono">{rate.toFixed(1)}</td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      {items[itemId]?.imageUrl && (
                        <img src={items[itemId].imageUrl} alt={items[itemId]?.name || itemId} className="w-6 h-6 object-contain" />
                      )}
                      <span>{items[itemId]?.name || itemId}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">0% of limit (N/A)</td>
                  </tr>
                ))}
                {Object.keys(summary.rawInputs).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-center text-gray-400">No resources</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Middle Column */}
        <div className="flex flex-col gap-6">
          
          {/* Production Panel */}
          <div className="flex flex-col gap-0 rounded shadow bg-[#34404c] border border-[#3f4d5a]">
            <div className="bg-[#3f4d5a] px-4 py-3 font-semibold text-[#f8fafc] flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <span>Production</span>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-[#4d5c6b] bg-[#3c4956]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-300">Produced</th>
                    <th className="px-4 py-3 font-medium text-gray-300">Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4d5c6b]">
                  {Object.entries(summary.producedItems).map(([itemId, rate]) => (
                    <tr key={itemId} className="hover:bg-[#3f4d5a]/50 text-gray-200">
                      <td className="px-4 py-3 font-mono">{rate.toFixed(1)}</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        {items[itemId]?.imageUrl && (
                          <img src={items[itemId].imageUrl} alt={items[itemId]?.name || itemId} className="w-6 h-6 object-contain" />
                        )}
                        <span>{items[itemId]?.name || itemId}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Buildings Panel */}
          <div className="flex flex-col gap-0 rounded shadow bg-[#34404c] border border-[#3f4d5a]">
            <div className="bg-[#3f4d5a] px-4 py-3 font-semibold text-[#f8fafc] flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏭</span>
                <span>Buildings</span>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-[#4d5c6b] bg-[#3c4956]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-300">Amount</th>
                    <th className="px-4 py-3 font-medium text-gray-300">Building</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#4d5c6b]">
                  {Object.entries(summary.machineCounts).map(([machineId, count]) => (
                    <tr key={machineId} className="hover:bg-[#3f4d5a]/50 text-gray-200">
                      <td className="px-4 py-3 font-mono">{Math.ceil(count)}</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        {machines[machineId]?.imageUrl && (
                          <img src={machines[machineId].imageUrl} alt={machines[machineId]?.name || machineId} className="w-6 h-6 object-contain" />
                        )}
                        <span>{machines[machineId]?.name || machineId}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#3c4956] font-medium border-t border-[#4d5c6b]">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-center text-gray-200">
                      Total: {Object.values(summary.machineCounts).reduce((a, b) => a + Math.ceil(b), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
          {/* Power Panel */}
          <div className="flex flex-col gap-0 rounded shadow bg-[#34404c] border border-[#3f4d5a]">
            <div className="bg-[#3f4d5a] px-4 py-3 font-semibold text-[#f8fafc] flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span>Power</span>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
            </div>
            <div className="p-8 flex items-center justify-center text-gray-200">
              <span className="text-3xl font-semibold">{Math.ceil(summary.totalPower)} <span className="text-xl font-normal">MW</span></span>
            </div>
          </div>

          {/* Alternate recipes needed */}
          <div className="flex flex-col gap-0 rounded shadow bg-[#34404c] border border-[#3f4d5a]">
            <div className="bg-[#3f4d5a] px-4 py-3 font-semibold text-[#f8fafc] flex items-center justify-between rounded-t">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔄</span>
                <span>Alternate recipes needed</span>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-[#4d5c6b] bg-[#3c4956]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-center text-gray-300">Recipe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-400 font-medium">Total: 0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}

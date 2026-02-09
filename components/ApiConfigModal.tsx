

import React, { useState } from 'react';
import { DriverRecord } from '../types';
import { getComputedBillDate } from '../utils/calculations';
import { X, RefreshCw, CheckCircle, XCircle, Globe, FileCode, ShieldCheck, ChevronDown, ChevronRight, Code, ExternalLink, Minus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  isMinimized: boolean;
  records: DriverRecord[];
  onClose: () => void;
  onMinimize: () => void;
  onSyncComplete: (updatedRecords: DriverRecord[]) => void;
}

interface SyncLog {
  plate: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  requestUrl?: string;
  responseJson?: any;
  overdueResponseJson?: any;
  errorDetail?: string;
}

const ApiConfigModal: React.FC<Props> = ({ isOpen, isMinimized, records, onClose, onMinimize, onSyncComplete }) => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  
  // Configuration State
  const [apiHost, setApiHost] = useState('https://frp-dad.com:34746');
  const [apiPath, setApiPath] = useState('/test.php');
  const [useProxy, setUseProxy] = useState(false);

  if (!isOpen || isMinimized) return null;

  const startSync = async () => {
    setIsSyncing(true);
    setLogs([]);
    setExpandedLogIndex(null);
    const updatedRecords = [...records];
    const newLogs: SyncLog[] = [];

    // 循环同步所有记录
    for (let i = 0; i < updatedRecords.length; i++) {
      const record = updatedRecords[i];
      
      const cleanHost = apiHost.replace(/\/$/, '');
      const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
      
      // 动态计算当前账单日期
      const computedDate = getComputedBillDate(record.contractStartDate);
      const y = computedDate.getFullYear();
      const m = String(computedDate.getMonth() + 1).padStart(2, '0');
      const d = String(computedDate.getDate()).padStart(2, '0');
      const formattedDate = `${y}/${m}/${d}`; 

      // 1. 当前账单请求参数
      const queryParams = new URLSearchParams({
        carid: record.licensePlate,
        date: formattedDate,
        mode: record.mode,
        _t: Date.now().toString()
      });

      const targetUrl = `${cleanHost}${cleanPath}?${queryParams.toString()}`;
      
      // 2. 逾期账单请求参数
      const overdueQueryParams = new URLSearchParams({
        carid: record.licensePlate,
        date: formattedDate,
        mode: record.mode,
        state: 'overdue',
        _t: Date.now().toString()
      });
      const overdueUrl = `${cleanHost}${cleanPath}?${overdueQueryParams.toString()}`;

      let logEntry: SyncLog = {
          plate: record.licensePlate,
          status: 'pending',
          message: '正在请求...',
          requestUrl: targetUrl 
      };

      try {
        // --- 请求 1: 当前账单 ---
        const fetchUrl = useProxy 
            ? `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` 
            : targetUrl;

        const res = await fetch(fetchUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status} (Current)`);
        
        const json = await res.json();
        logEntry.responseJson = json;
        
        const bills = json.matched_bills || [];
        if (bills.length > 0) {
            const bill = bills[0];
            // 架构纠偏：解决 Falsy (0) 值不更新 Bug。采用显式非空检查，并兼容多种命名字段。
            const paidValue = bill.already_pay_amount !== undefined ? bill.already_pay_amount : bill.alreadyPayAmount;
            if (paidValue !== undefined && paidValue !== null) {
                record.actualPaid = Number(paidValue);
            }
        }

        // --- 请求 2: 逾期账单 ---
        const fetchOverdueUrl = useProxy
            ? `https://api.allorigins.win/raw?url=${encodeURIComponent(overdueUrl)}`
            : overdueUrl;
            
        const resOverdue = await fetch(fetchOverdueUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!resOverdue.ok) throw new Error(`HTTP ${resOverdue.status} (Overdue)`);

        const jsonOverdue = await resOverdue.json();
        logEntry.overdueResponseJson = jsonOverdue;

        // 存储原始逾期详情
        if (jsonOverdue && jsonOverdue.overdue_bills) {
            record.apiOverdueDetails = jsonOverdue.overdue_bills;
        } else {
            record.apiOverdueDetails = [];
        }

        // 获取 total_due
        let calculatedOverdue = 0;
        if (jsonOverdue && jsonOverdue.total_due !== undefined) {
            calculatedOverdue = parseFloat(jsonOverdue.total_due);
        } else if (jsonOverdue.matched_bills) {
            jsonOverdue.matched_bills.forEach((b: any) => {
                 const should = Number(b.should_pay_amount) || 0;
                 const paid = Number(b.already_pay_amount) || 0;
                 calculatedOverdue += Math.max(0, should - paid);
            });
        }
        
        if (isNaN(calculatedOverdue)) calculatedOverdue = 0;
        record.overdueRentAmount = calculatedOverdue;

        logEntry.status = 'success';
        logEntry.message = `实付:${record.actualPaid} / 逾期:${record.overdueRentAmount}`;

      } catch (err) {
        logEntry.status = 'error';
        logEntry.message = '请求失败';
        logEntry.errorDetail = (err as Error).message;
      }

      newLogs.push(logEntry);
      setLogs([...newLogs]);
    }

    onSyncComplete(updatedRecords);
    setIsSyncing(false);
  };

  const toggleExpand = (index: number) => {
    setExpandedLogIndex(expandedLogIndex === index ? null : index);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-fade"
      onClick={(e) => !isSyncing && e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-pop">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold flex items-center text-brand-900">
            <RefreshCw className={`w-5 h-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            批量同步租金 ({records.length})
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onMinimize} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-lg transition-colors">
               <Minus className="w-5 h-5" />
            </button>
            <button onClick={onClose} disabled={isSyncing} className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-1 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 配置区 */}
        <div className="p-5 border-b space-y-4 bg-white">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center">
                  <Globe className="w-3 h-3 mr-1" /> API 服务器地址 (Host)
                </label>
                <input 
                    value={apiHost}
                    onChange={e => setApiHost(e.target.value)}
                    placeholder="https://frp-dad.com:34746"
                    className="w-full text-sm border rounded-lg px-3 py-2 font-mono text-gray-600 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center">
                  <FileCode className="w-3 h-3 mr-1" /> 脚本路径 (Path)
                </label>
                <input 
                    value={apiPath}
                    onChange={e => setApiPath(e.target.value)}
                    placeholder="/test.php"
                    className="w-full text-sm border rounded-lg px-3 py-2 font-mono text-gray-600 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
           </div>

           <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                 <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                 <div>
                    <span className="text-sm font-bold text-blue-900">开启跨域代理 (解决 Failed to fetch)</span>
                    <p className="text-xs text-blue-700 mt-0.5">
                       如果 API 不支持 CORS 或返回 Fetch Error，请尝试开启此选项。
                    </p>
                 </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={useProxy}
                  onChange={e => setUseProxy(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
           </div>
        </div>

        {/* 日志详情区 */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 font-mono text-xs space-y-2 no-scrollbar">
           {logs.length === 0 && !isSyncing && (
             <div className="text-center text-gray-400 py-16 flex flex-col items-center">
                <div className="mb-4 p-4 bg-white rounded-full shadow-sm">
                   <RefreshCw className="w-8 h-8 text-gray-100" />
                </div>
                点击下方按钮开始同步...
             </div>
           )}
           {logs.map((log, idx) => (
             <div key={idx} className={`rounded-xl border overflow-hidden shadow-sm ${
                log.status === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'
             }`}>
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(idx)}
                >
                    <div className="flex items-center gap-3">
                        {expandedLogIndex === idx ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <span className={`font-bold text-sm ${log.status === 'success' ? 'text-gray-800' : 'text-red-700'}`}>{log.plate}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-bold ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                             {log.message}
                         </span>
                         {log.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500"/> : <XCircle className="w-4 h-4 text-red-500"/>}
                    </div>
                </div>

                {expandedLogIndex === idx && (
                    <div className="p-4 border-t bg-gray-50/30 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div>
                            <div className="text-[9px] uppercase text-gray-400 font-black mb-1.5 flex items-center">
                                <ExternalLink className="w-3 h-3 mr-1" /> 请求 URL (Request)
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-gray-200 break-all select-all font-mono text-[10px] text-gray-500 shadow-sm">
                                {log.requestUrl}
                            </div>
                        </div>

                        {log.errorDetail && (
                            <div>
                                <div className="text-[9px] uppercase text-red-400 font-black mb-1.5">错误详情 (Error)</div>
                                <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 text-red-600 text-[10px]">
                                    {log.errorDetail}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <div className="text-[9px] uppercase text-gray-400 font-black mb-1.5 flex items-center">
                                  <Code className="w-3 h-3 mr-1" /> 当前账单 (Response)
                              </div>
                              <div className="bg-slate-900 text-slate-300 p-3 rounded-xl overflow-x-auto border border-slate-800 shadow-inner max-h-48 no-scrollbar">
                                  <pre className="font-mono text-[9px] horizontal-scrollbar">
                                      {log.responseJson ? JSON.stringify(log.responseJson, null, 2) : 'No data.'}
                                  </pre>
                              </div>
                          </div>

                          <div>
                              <div className="text-[9px] uppercase text-gray-400 font-black mb-1.5 flex items-center">
                                  <Code className="w-3 h-3 mr-1" /> 逾期数据 (Overdue)
                              </div>
                              <div className="bg-slate-900 text-slate-300 p-3 rounded-xl overflow-x-auto border border-slate-800 shadow-inner max-h-48 no-scrollbar">
                                  <pre className="font-mono text-[9px] horizontal-scrollbar">
                                      {log.overdueResponseJson ? JSON.stringify(log.overdueResponseJson, null, 2) : 'No overdue data.'}
                                  </pre>
                              </div>
                          </div>
                        </div>
                    </div>
                )}
             </div>
           ))}
        </div>

        <div className="p-5 border-t bg-white flex justify-end gap-3 sticky bottom-0">
          <button 
            onClick={onClose}
            disabled={isSyncing}
            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            关闭
          </button>
          <button 
            onClick={startSync}
            disabled={isSyncing}
            className="px-8 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 text-sm font-bold flex items-center shadow-lg shadow-brand-100 transition-all active:scale-95"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 正在同步...
              </>
            ) : (
              '开始同步'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiConfigModal;
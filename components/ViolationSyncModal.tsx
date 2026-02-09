

import React, { useState } from 'react';
import { DriverRecord } from '../types';
import { X, CheckCircle, XCircle, ShieldAlert, ChevronDown, ChevronRight, ExternalLink, Code, Minus, ShieldQuestion } from 'lucide-react';

interface Props {
  isOpen: boolean;
  isMinimized: boolean;
  records: DriverRecord[];
  onClose: () => void;
  onMinimize: () => void;
  onSyncComplete: (updatedRecords: DriverRecord[]) => void;
  onProgress?: (current: number, total: number) => void;
}

interface ViolationLog {
  plate: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  detectedMode?: 'kuaikuai' | 'kuaiwen';
  requestUrl?: string;
  responseJson?: any;
  errorDetail?: string;
}

const ViolationSyncModal: React.FC<Props> = ({ isOpen, isMinimized, records, onClose, onMinimize, onSyncComplete, onProgress }) => {
  const [logs, setLogs] = useState<ViolationLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  const [targetMode, setTargetMode] = useState<'kuaikuai' | 'kuaiwen'>('kuaikuai');
  const [apiHost, setApiHost] = useState('https://frp-dad.com:34746');
  const [apiPath, setApiPath] = useState('/ga.php');

  if (!isOpen || isMinimized) return null;

  const startSync = async () => {
    setIsSyncing(true);
    setLogs([]);
    setExpandedLogIndex(null);
    const updatedRecords = [...records];
    const newLogs: ViolationLog[] = [];

    if (onProgress) onProgress(0, updatedRecords.length);

    for (let i = 0; i < updatedRecords.length; i++) {
      const record = updatedRecords[i];

      // Logic Point 8: Skip if violationMode is already known and different from targetMode
      if (record.violationMode && record.violationMode !== targetMode) {
          newLogs.push({
              plate: record.licensePlate,
              status: 'success',
              message: `跳过 (当前模式 ${record.violationMode} ≠ 目标 ${targetMode})`,
          });
          if (onProgress) onProgress(i + 1, updatedRecords.length);
          continue;
      }

      const cleanHost = apiHost.replace(/\/$/, '');
      const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
      const startDate = record.contractStartDate || new Date().toISOString().split('T')[0];

      const queryParams = new URLSearchParams({
        carid: record.licensePlate,
        start: startDate,
        mode: targetMode,
        _t: Date.now().toString()
      });

      const targetUrl = `${cleanHost}${cleanPath}?${queryParams.toString()}`;

      let logEntry: ViolationLog = {
          plate: record.licensePlate,
          status: 'pending',
          message: '查询中...',
          requestUrl: targetUrl
      };

      try {
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const json = await res.json();
        logEntry.responseJson = json;

        if (Array.isArray(json)) {
            if (json.length > 0) {
                // 3.1 成功获取数据 (有违章)
                const totalFine = json.reduce((acc, curr) => acc + (Number(curr.fine) || 0), 0);
                const totalPoints = json.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0);
                
                record.violationCount = json.length;
                record.violationFine = totalFine;
                record.violationPoints = totalPoints;
                record.violationMode = targetMode;
                record.apiViolationDetails = json;

                logEntry.status = 'success';
                logEntry.message = `更新: ${json.length} 条违章, ¥${totalFine}, ${totalPoints}分`;
                logEntry.detectedMode = targetMode;
            } else {
                // 3.3 / 6 无违章 (Empty Array) -> 模式正确，数据清零
                record.violationCount = 0;
                record.violationFine = 0;
                record.violationPoints = 0;
                record.violationMode = targetMode;
                record.apiViolationDetails = [];

                logEntry.status = 'success';
                logEntry.message = `更新: 无违章`;
                logEntry.detectedMode = targetMode;
            }
        } else if (json && json.error) {
             const raw = json.raw_content;
             const rawMsg = (raw && typeof raw === 'object' && raw.message) ? String(raw.message) : "";
             const errorMsg = String(json.error);

             if (rawMsg.includes("只能查询已绑定的机动车违法") || errorMsg.includes("只能查询已绑定的机动车违法")) {
                 // 3.4 / 7 模式错误 -> 标记为相反模式
                 const otherMode = targetMode === 'kuaikuai' ? 'kuaiwen' : 'kuaikuai';
                 record.violationMode = otherMode;
                 // 不清空现有数据，因为只是判定了模式错误，并没有获取到正确模式的数据
                 logEntry.status = 'success'; 
                 logEntry.message = `模式错误: 标记为 ${otherMode}`;
                 logEntry.detectedMode = otherMode;
             } else if (errorMsg.includes('Cookie') || rawMsg.includes('Cookie')) {
                 // 3.2 / 5 Cookie失效
                 throw new Error("Cookie 失效");
             } else {
                 throw new Error(errorMsg || "API未知错误");
             }
        } else {
             throw new Error("未知响应格式");
        }

      } catch (err) {
        logEntry.status = 'error';
        logEntry.message = (err as Error).message;
        logEntry.errorDetail = (err as Error).message;
      }

      newLogs.push(logEntry);
      setLogs([...newLogs]);
      
      if (onProgress) onProgress(i + 1, updatedRecords.length);
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
        <div className="flex items-center justify-between p-4 border-b bg-rose-50">
          <h2 className="text-lg font-bold flex items-center text-rose-900">
            <ShieldAlert className={`w-5 h-5 mr-2 ${isSyncing ? 'animate-pulse' : ''}`} />
            违章数据批量更新 ({records.length})
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onMinimize} className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-100 rounded-lg transition-colors">
               <Minus className="w-5 h-5" />
            </button>
            <button onClick={onClose} disabled={isSyncing} className="text-rose-400 hover:text-rose-600 disabled:opacity-50 p-1 hover:bg-rose-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 配置区 */}
        <div className="p-5 border-b space-y-4 bg-white">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-gray-500 uppercase">查询模式设定:</span>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setTargetMode('kuaikuai')}
                        disabled={isSyncing}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${targetMode === 'kuaikuai' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          Kuaikuai (快快)
                      </button>
                      <button 
                        onClick={() => setTargetMode('kuaiwen')}
                        disabled={isSyncing}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${targetMode === 'kuaiwen' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          Kuaiwen (快文)
                      </button>
                  </div>
              </div>
              <div className="text-[10px] text-gray-400 max-w-xs text-right leading-tight">
                  <ShieldQuestion className="w-3 h-3 inline mr-1" />
                  模式推断逻辑：
                  <br/>
                  无数据 = 模式正确，更新0违章
                  <br/>
                  未绑定错误 = 模式错误，标记为相反模式
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">API Host</label>
                <input 
                    value={apiHost}
                    onChange={e => setApiHost(e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2 font-mono text-gray-600 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">API Path</label>
                <input 
                    value={apiPath}
                    onChange={e => setApiPath(e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2 font-mono text-gray-600 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
           </div>
        </div>

        {/* 日志详情区 */}
        <div className="flex-1 overflow-y-auto p-4 bg-rose-50/30 font-mono text-xs space-y-2 no-scrollbar">
           {logs.length === 0 && !isSyncing && (
             <div className="text-center text-rose-300 py-16 flex flex-col items-center">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                点击下方按钮开始更新违章数据...
             </div>
           )}
           {logs.map((log, idx) => (
             <div key={idx} className={`rounded-xl border overflow-hidden shadow-sm ${
                log.status === 'success' ? 'bg-white border-green-100' : 'bg-white border-rose-100'
             }`}>
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(idx)}
                >
                    <div className="flex items-center gap-3">
                        {expandedLogIndex === idx ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <span className="font-bold text-sm text-gray-800">{log.plate}</span>
                        {log.detectedMode && (
                             <span className={`px-1.5 py-0.5 text-[9px] rounded border ${log.detectedMode === targetMode ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                 {log.detectedMode}
                             </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-bold ${log.status === 'success' ? 'text-green-600' : 'text-rose-600'}`}>
                             {log.message}
                         </span>
                         {log.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500"/> : <XCircle className="w-4 h-4 text-rose-500"/>}
                    </div>
                </div>

                {expandedLogIndex === idx && (
                    <div className="p-4 border-t bg-gray-50/30 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div>
                            <div className="text-[9px] uppercase text-gray-400 font-black mb-1.5 flex items-center">
                                <ExternalLink className="w-3 h-3 mr-1" /> 请求 URL
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-gray-200 break-all select-all font-mono text-[10px] text-gray-500 shadow-sm">
                                {log.requestUrl}
                            </div>
                        </div>

                        {log.errorDetail && (
                            <div>
                                <div className="text-[9px] uppercase text-rose-400 font-black mb-1.5">错误详情</div>
                                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-rose-600 text-[10px]">
                                    {log.errorDetail}
                                </div>
                            </div>
                        )}

                        <div>
                              <div className="text-[9px] uppercase text-gray-400 font-black mb-1.5 flex items-center">
                                  <Code className="w-3 h-3 mr-1" /> API 响应数据
                              </div>
                              <div className="bg-slate-900 text-slate-300 p-3 rounded-xl overflow-x-auto border border-slate-800 shadow-inner max-h-48 no-scrollbar">
                                  <pre className="font-mono text-[9px] horizontal-scrollbar">
                                      {log.responseJson ? JSON.stringify(log.responseJson, null, 2) : 'No data.'}
                                  </pre>
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
            className="px-8 py-2 bg-rose-700 text-white rounded-xl hover:bg-rose-800 disabled:opacity-50 text-sm font-bold flex items-center shadow-lg shadow-rose-100 transition-all active:scale-95"
          >
            {isSyncing ? (
              <>
                <ShieldAlert className="w-4 h-4 mr-2 animate-pulse" /> 更新中...
              </>
            ) : (
              '开始更新'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViolationSyncModal;


import React, { useState } from 'react';
import { DriverRecord, ColorSettings } from '../types';
import { calculateBillingStatus, generateOfficialInformLetter, generatePoliteReminder, fetchInformMetadata } from '../utils/calculations';
import { User, Car, RefreshCw, AlertOctagon, BellRing, ClipboardCopy, CheckCircle, Megaphone, CheckCheck, MessageSquareText, Undo2, Loader2, ShieldAlert, Receipt } from 'lucide-react';

interface Props {
  record: DriverRecord;
  colors: ColorSettings;
  hideRemindStatus?: boolean; // 新增：是否隐藏催缴视觉状态
  onView: (record: DriverRecord) => void;
  onEdit: (record: DriverRecord) => void;
  onDelete: (id: string) => void;
  onSync: (record: DriverRecord) => void;
  onViolationSync: (record: DriverRecord) => void; // New Handler
  onRemind: (record: DriverRecord) => void;
}

const DriverCard: React.FC<Props> = ({ record, colors, hideRemindStatus, onView, onEdit, onDelete, onSync, onViolationSync, onRemind }) => {
  const [copiedType, setCopiedType] = useState<'letter' | 'text' | null>(null);
  const [isFetchingLetter, setIsFetchingLetter] = useState(false);
  const status = calculateBillingStatus(record, colors.highlightRule);

  // --- 样式状态机 ---
  const isDuePeriod = status.isDueDay || status.isPreDueDay;
  // 逻辑无损扩展：如果 hideRemindStatus 为 true，则临时使催缴标志位失效
  const isUnprocessedDue = !status.isReminded && isDuePeriod && !hideRemindStatus;
  
  let accentColor = "#3b82f6"; 
  let cardBorder = "border-gray-100";
  let cardBg = "bg-white";
  let riskLabel = "";

  if (isUnprocessedDue) {
    accentColor = status.isDueDay ? "#0000ff" : "#f59e0b"; 
    cardBorder = status.isDueDay ? "border-[#0000ff] border-[3px]" : "border-[#f59e0b] border-[3px]";
    cardBg = status.isDueDay ? "bg-[#f5f7ff]" : "bg-[#fffbeb]";
    riskLabel = status.isDueDay ? "今日催缴" : "明日催缴";
  } else if (status.riskLevel === 'severe') {
    accentColor = colors.severeColor;
    cardBorder = "border-purple-200 border-2";
    cardBg = "bg-purple-50/30";
    riskLabel = "严重风险";
  } else if (status.riskLevel === 'high') {
    accentColor = colors.riskColor;
    cardBorder = "border-red-200 border-2";
    cardBg = "bg-red-50/30";
    riskLabel = "高危预警";
  }

  const handleCopy = async (e: React.MouseEvent, type: 'letter' | 'text') => {
    e.stopPropagation();
    
    if (type === 'letter') {
      setIsFetchingLetter(true);
      try {
        const apiData = await fetchInformMetadata(record.licensePlate, record.mode);
        const text = generateOfficialInformLetter(record, status, apiData);
        await navigator.clipboard.writeText(text);
        setCopiedType('letter');
        setTimeout(() => setCopiedType(null), 2000);
      } catch (err) {
        console.error('Failed to fetch or copy letter: ', err);
      } finally {
        setIsFetchingLetter(false);
      }
    } else {
      try {
        const text = generatePoliteReminder(record, status);
        await navigator.clipboard.writeText(text);
        setCopiedType('text');
        setTimeout(() => setCopiedType(null), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  return (
    <div 
      className={`relative flex flex-col p-6 rounded-[2.5rem] shadow-sm transition-all duration-300 hover:shadow-2xl cursor-pointer ${cardBg} ${cardBorder} group`}
      onClick={() => onView(record)}
    >
      {/* 顶部勋章 */}
      {riskLabel && (
        <div className="absolute top-0 right-0 z-10">
           <span className="inline-flex items-center px-4 py-2.5 rounded-bl-3xl text-[10px] font-black text-white shadow-md" style={{ backgroundColor: accentColor }}>
              {isUnprocessedDue ? <BellRing className="w-3.5 h-3.5 mr-1 animate-pulse" /> : <AlertOctagon className="w-3.5 h-3.5 mr-1" />}
              {riskLabel}
           </span>
        </div>
      )}

      {/* 头部：头像 + 姓名 + 车牌 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all shrink-0">
          <User className="w-7 h-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-2xl font-black text-gray-900 leading-tight truncate">{record.name}</h3>
          <div className="flex items-center text-[11px] text-gray-400 font-bold mt-1">
            <Car className="w-3.5 h-3.5 mr-1" />
            <span className="font-mono tracking-tight truncate">{record.licensePlate}</span>
            <span className="mx-1 opacity-20">|</span>
            <span className="opacity-60">{record.mode === 'kuaiwen' ? '快文' : '快快'}</span>
            {record.violationMode && record.violationMode !== record.mode && (
              <span className="ml-1 px-1 rounded bg-orange-100 text-orange-600 border border-orange-200 text-[8px] scale-90 origin-left">
                违:{record.violationMode === 'kuaiwen' ? '文' : '快'}
              </span>
            )}
            {status.isReminded && (
                <span className="ml-2 flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[8px] font-black border border-green-100 animate-in fade-in zoom-in">
                    <CheckCheck className="w-2.5 h-2.5 mr-0.5" /> 已催办
                </span>
            )}
          </div>
        </div>
      </div>

      {/* 实付/应付 & 周期胶囊 */}
      <div className="bg-white/40 px-5 py-4 rounded-[1.8rem] border border-gray-100 mb-6 shadow-inner">
        <div className="flex justify-between items-center mb-1">
            <div className="text-[9px] font-black text-gray-400 uppercase">实付 / 应付 (本月)</div>
            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-sm">
                第 {status.currentPeriod} 周
            </span>
        </div>
        <div className="text-2xl font-black tracking-tighter">
            <span className="text-green-600">¥{record.actualPaid}</span>
            <span className="text-gray-300 mx-1.5 text-sm font-normal">/</span>
            <span className="text-gray-400 text-base font-bold">¥{record.totalPayable}</span>
        </div>
        <div className="mt-3 flex items-center text-[9px] text-blue-400 font-bold border-t border-gray-50 pt-2">
            <CalendarIcon className="w-3 h-3 mr-1" />
            {status.periodRange.replace('-', ' → ')}
        </div>
      </div>

      {/* 欠费详情 */}
      <div className="px-2 flex items-end justify-between gap-1 mb-6">
        <div className="min-w-0 flex-1">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">当前结算总欠款</div>
           <div className="text-3xl font-black tracking-tighter" style={{ color: (status.riskLevel === 'normal' && !isDuePeriod) ? '#7c3aed' : accentColor }}>
             ¥{status.totalDebt.toFixed(0)}
           </div>
        </div>
        <div className="text-right border-l border-gray-100 pl-4 shrink-0">
           <div className="text-[10px] font-black text-gray-400 uppercase mb-1">拖欠租金</div>
           <div className="text-2xl font-black text-orange-500">¥{status.unpaidRent.toFixed(0)}</div>
        </div>
      </div>

      {/* 违章统计色块 */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        <div className="bg-red-50/50 border border-red-100 p-2.5 rounded-2xl text-center">
            <div className="text-[9px] text-red-400 font-bold mb-0.5">违章条数</div>
            <div className="text-lg font-black text-red-600 leading-none">
                {record.violationCount}<span className="text-[10px] ml-0.5">条</span>
            </div>
        </div>
        <div className="bg-yellow-50/50 border border-yellow-100 p-2.5 rounded-2xl text-center">
            <div className="text-[9px] text-yellow-500 font-bold mb-0.5">扣分</div>
            <div className="text-lg font-black text-yellow-600 leading-none">
                {record.violationPoints}<span className="text-[10px] ml-0.5">分</span>
            </div>
        </div>
        <div className="bg-orange-50/50 border border-orange-100 p-2.5 rounded-2xl text-center">
            <div className="text-[9px] text-orange-400 font-bold mb-0.5">罚款+处理</div>
            <div className="text-lg font-black text-orange-600 leading-none">
                <span className="text-xs">¥</span>{record.violationFine + record.violationPoints * 200}
            </div>
        </div>
      </div>

      {/* 动作矩阵 */}
      <div className="mt-auto">
        {isDuePeriod ? (
          /* 催缴期布局 */
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-3 gap-2">
                <button 
                  disabled={isFetchingLetter}
                  onClick={(e) => handleCopy(e, 'letter')} 
                  className={`flex flex-col items-center justify-center py-2 rounded-2xl border transition-all active:scale-95 ${
                    copiedType === 'letter' ? 'bg-green-600 text-white border-green-600' : 'bg-brand-50 text-brand-700 border-brand-100 hover:bg-brand-100'
                  }`}
                >
                  {isFetchingLetter ? <Loader2 className="w-4 h-4 mb-0.5 animate-spin" /> : (copiedType === 'letter' ? <CheckCircle className="w-4 h-4 mb-0.5" /> : <ClipboardCopy className="w-4 h-4 mb-0.5" />)}
                  <span className="text-[8px] font-black uppercase tracking-tighter">
                    {isFetchingLetter ? '请求中...' : (copiedType === 'letter' ? '已复制' : '复制函件')}
                  </span>
                </button>

                <button 
                  onClick={(e) => handleCopy(e, 'text')} 
                  className={`flex flex-col items-center justify-center py-2 rounded-2xl border transition-all active:scale-95 ${
                    copiedType === 'text' ? 'bg-green-600 text-white border-green-600' : 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'
                  }`}
                >
                  {copiedType === 'text' ? <CheckCircle className="w-4 h-4 mb-0.5" /> : <MessageSquareText className="w-4 h-4 mb-0.5" />}
                  <span className="text-[8px] font-black uppercase tracking-tighter">{copiedType === 'text' ? '已复制' : '复制文案'}</span>
                </button>

                <button 
                  onClick={(e) => { e.stopPropagation(); onRemind(record); }} 
                  className={`flex flex-col items-center justify-center py-2 rounded-2xl border transition-all active:scale-95 ${
                    status.isReminded 
                    ? 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200' 
                    : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100'
                  }`}
                >
                  {status.isReminded ? <Undo2 className="w-4 h-4 mb-0.5" /> : <Megaphone className="w-4 h-4 mb-0.5" />}
                  <span className="text-[8px] font-black uppercase tracking-tighter">
                    {status.isReminded ? '撤销已催' : '确认已催'}
                  </span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onViolationSync(record); }} 
                  className="flex items-center justify-center gap-2 h-11 rounded-2xl text-[11px] font-black bg-rose-700 text-white border border-rose-800 hover:bg-rose-800 shadow-md transition-all active:scale-95"
                >
                  <ShieldAlert className="w-4 h-4" /> 更新违章
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onSync(record); }} 
                  className="flex items-center justify-center gap-2 h-11 rounded-2xl text-[11px] font-black bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 shadow-md transition-all active:scale-95"
                >
                  <Receipt className="w-4 h-4" /> 账单同步
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
                <button onClick={(e) => { e.stopPropagation(); onEdit(record); }} className="h-10 rounded-2xl text-[11px] font-black bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">编辑信息</button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="h-10 rounded-2xl text-[11px] font-black bg-red-50 text-red-500 hover:bg-red-100 transition-all">删除卡片</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
               <button 
                  disabled={isFetchingLetter}
                  onClick={(e) => handleCopy(e, 'letter')} 
                  className={`flex items-center justify-center gap-2 h-11 rounded-2xl text-[11px] font-black transition-all active:scale-95 border ${
                    copiedType === 'letter' ? 'bg-green-600 text-white border-green-700' : 'bg-brand-50 text-brand-700 border-brand-100 hover:bg-brand-100'
                  }`}
               >
                  {isFetchingLetter ? <Loader2 className="w-4 h-4 animate-spin" /> : (copiedType === 'letter' ? <CheckCircle className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />)}
                  {isFetchingLetter ? '请求中...' : (copiedType === 'letter' ? '已复制' : '复制函件')}
               </button>
               
               <button 
                  onClick={(e) => { e.stopPropagation(); onViolationSync(record); }} 
                  className="flex items-center justify-center gap-2 h-11 rounded-2xl text-[11px] font-black bg-rose-700 text-white border border-rose-800 hover:bg-rose-800 shadow-md transition-all active:scale-95"
               >
                  <ShieldAlert className="w-4 h-4" /> 更新违章
               </button>
            </div>
            
            <button 
                  onClick={(e) => { e.stopPropagation(); onSync(record); }} 
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl text-[11px] font-black bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 shadow-md transition-all active:scale-95"
               >
                  <Receipt className="w-4 h-4" /> 账单同步
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={(e) => { e.stopPropagation(); onEdit(record); }} className="h-11 rounded-2xl text-[11px] font-black bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all border border-gray-200">编辑</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="h-11 rounded-2xl text-[11px] font-black bg-red-50 text-red-500 hover:bg-red-100 transition-all border border-red-100">删除</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CalendarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

export default DriverCard;

import React, { useState, useRef } from 'react';
import { X, User, Car, Calendar, CreditCard, AlertTriangle, Clock, FileWarning, Activity, Hourglass, History, Copy, Check } from 'lucide-react';
import { DriverRecord, ColorSettings } from '../types';
import { calculateBillingStatus, formatDate } from '../utils/calculations';

interface Props {
  record: DriverRecord | null;
  colors: ColorSettings;
  onClose: () => void;
  onEdit: (record: DriverRecord) => void;
}

const DetailsModal: React.FC<Props> = ({ record, colors, onClose, onEdit }) => {
  const [copiedField, setCopiedField] = useState<'name' | 'plate' | null>(null);
  const mouseDownTarget = useRef<EventTarget | null>(null);

  if (!record) return null;

  const status = calculateBillingStatus(record, colors.highlightRule);

  const handleCopy = async (text: string, field: 'name' | 'plate') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // 1. 确保点击目标和当前监听目标一致（背景层）
    // 2. 确保鼠标按下时的起始点也在背景层（防止从容器内向外拖拽误触）
    // 3. 确保当前没有任何选中的文本内容（防止划选文字后松开误触）
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;
    
    if (
      e.target === e.currentTarget && 
      mouseDownTarget.current === e.currentTarget && 
      !hasSelection
    ) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-backdrop-fade"
      onMouseDown={(e) => (mouseDownTarget.current = e.target)}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col animate-modal-pop"
        onMouseDown={(e) => e.stopPropagation()} // 阻止内部按下事件冒泡到背景层
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="bg-brand-50 p-3 rounded-2xl">
              <User className="w-7 h-7 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 group">
                <h2 className="text-2xl font-black text-gray-900 leading-none">{record.name}</h2>
                <button 
                  onClick={() => handleCopy(record.name, 'name')}
                  className={`p-1.5 rounded-lg transition-all ${copiedField === 'name' ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand-600 opacity-0 group-hover:opacity-100'}`}
                  title="复制姓名"
                >
                  {copiedField === 'name' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center text-xs text-gray-400 font-mono mt-1 font-bold group">
                <Car className="w-3 h-3 mr-1" /> 
                <span>{record.licensePlate}</span>
                <button 
                  onClick={() => handleCopy(record.licensePlate, 'plate')}
                  className={`ml-2 p-1 rounded-md transition-all ${copiedField === 'plate' ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand-600 opacity-0 group-hover:opacity-100'}`}
                  title="复制车牌"
                >
                  {copiedField === 'plate' ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
                <span className="mx-2 text-gray-200">|</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{record.mode === 'kuaiwen' ? '快文新能源' : '快快租赁'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2.5 rounded-full hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* 1. 账单与财务 */}
          <div>
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-black text-gray-900 flex items-center uppercase tracking-widest">
                  <CreditCard className="w-4 h-4 mr-2 text-brand-500" /> 账单与财务中心
               </h3>
               <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full border">REALTIME BILLING</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 shadow-sm">
                  <div className="text-[10px] text-brand-600 mb-2 font-black uppercase tracking-wider">当前周期进度</div>
                  <div className="text-3xl font-black text-brand-700">第 {status.currentPeriod} 期</div>
                  <div className="text-[10px] text-brand-400 mt-1 font-bold">{status.periodRange}</div>
               </div>
               <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-[10px] text-gray-500 mb-2 font-black uppercase tracking-wider">本期实付/应付</div>
                  <div className="text-xl font-black flex items-baseline gap-1">
                    <span className="text-green-600">¥{record.actualPaid}</span>
                    <span className="text-gray-300 text-sm">/</span>
                    <span className="text-gray-600">¥{record.totalPayable}</span>
                  </div>
               </div>
               <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
                  <div className="text-[10px] text-red-500 mb-2 font-black uppercase tracking-wider">实时总欠租(含逾期)</div>
                  <div className="text-3xl font-black text-red-600">¥{status.realTimeArrears.toFixed(0)}</div>
                  <div className="text-[9px] text-red-300 mt-1 font-bold">包含往期欠费: ¥{record.overdueRentAmount || 0}</div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 2. 基础合同信息 */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center uppercase tracking-widest">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" /> 基础合同信息
              </h3>
              <div className="space-y-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-400 text-[10px] font-bold uppercase">合同开始日期</span>
                  <span className="text-sm font-bold text-gray-700">{formatDate(record.contractStartDate)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-400 text-[10px] font-bold uppercase">账单起始计算</span>
                  <span className="text-sm font-black text-brand-600">{formatDate(status.computedBillDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-[10px] font-bold uppercase">租期总时长</span>
                  <span className="text-sm font-bold text-gray-700">{record.rentDuration || '12'} 个月</span>
                </div>
              </div>
            </div>

            {/* 3. 当前违章详情 */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center uppercase tracking-widest">
                <FileWarning className="w-4 h-4 mr-2 text-red-500" /> 当前违章详情
              </h3>
              <div className="space-y-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-400 text-[10px] font-bold uppercase">违章条数 / 记分</span>
                  <span className="text-sm font-bold text-red-600">{record.violationCount} 条 / {record.violationPoints} 分</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-gray-400 text-[10px] font-bold uppercase">累计罚款总额</span>
                  <span className="text-sm font-black text-red-600">¥{record.violationFine}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-[10px] font-bold uppercase">处理截止时间</span>
                  <span className={`text-sm font-black ${record.violationDeadline ? 'text-orange-500' : 'text-gray-300'}`}>
                    {record.violationDeadline ? formatDate(record.violationDeadline) : '未设置'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. 历史记录 (Display Only) */}
          <div>
             <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center uppercase tracking-widest">
                <History className="w-4 h-4 mr-2 text-gray-400" /> 历史违章统计数据
             </h3>
             <div className="grid grid-cols-3 gap-4 bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-xl">
                <div>
                   <div className="text-[9px] text-gray-500 uppercase font-black mb-1">总条数</div>
                   <div className="text-xl font-bold text-white">{record.historyViolationCount}</div>
                </div>
                <div>
                   <div className="text-[9px] text-gray-500 uppercase font-black mb-1">总扣分</div>
                   <div className="text-xl font-bold text-white">{record.historyViolationPoints}</div>
                </div>
                <div>
                   <div className="text-[9px] text-gray-500 uppercase font-black mb-1">总罚款</div>
                   <div className="text-xl font-bold text-green-400">¥{record.historyViolationFine}</div>
                </div>
             </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-between items-center sticky bottom-0">
           <div className="text-[10px] text-gray-400 font-bold max-w-[200px]">注意：违章处理费已按 1分=200元 + 罚款 计算入总欠租中。</div>
           <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 text-xs font-bold transition">返回</button>
              <button onClick={() => { onClose(); onEdit(record); }} className="px-8 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 text-xs font-bold shadow-lg shadow-brand-100 transition active:scale-95">编辑司机数据</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;

import React, { useState } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';

interface FilterConfig {
  minArrears: string;
  minViolationCost: string;
  minTotalDebt: string;
}

interface Props {
  isOpen: boolean;
  currentConfig: FilterConfig;
  onClose: () => void;
  onApply: (config: FilterConfig) => void;
}

const FilterModal: React.FC<Props> = ({ isOpen, currentConfig, onClose, onApply }) => {
  const [config, setConfig] = useState<FilterConfig>(currentConfig);

  if (!isOpen) return null;

  const handleReset = () => {
    const resetConfig = { minArrears: '', minViolationCost: '', minTotalDebt: '' };
    setConfig(resetConfig);
    onApply(resetConfig);
    onClose();
  };

  const handleApply = () => {
    onApply(config);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-fade"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-pop">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold flex items-center text-gray-800">
            <Filter className="w-5 h-5 mr-2 text-brand-600" />
            高级筛选
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
           <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              总欠款 (≥)
              <span className="text-[10px] font-normal text-gray-500 ml-2">(欠租+逾期+违章费)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">¥</span>
              <input 
                type="number" 
                placeholder="例如: 1200"
                value={config.minTotalDebt}
                onChange={(e) => setConfig({ ...config, minTotalDebt: e.target.value })}
                className="w-full border-2 border-brand-100 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-bold text-brand-700"
              />
            </div>
          </div>
          
          <div className="border-t pt-4">
             <div className="text-xs text-gray-400 mb-3 uppercase font-bold">详细筛选 (逻辑: AND)</div>
              <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    欠租金额 (≥)
                    </label>
                    <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">¥</span>
                    <input 
                        type="number" 
                        placeholder="例如: 1000"
                        value={config.minArrears}
                        onChange={(e) => setConfig({ ...config, minArrears: e.target.value })}
                        className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    违章处理费 (≥)
                    </label>
                    <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">¥</span>
                    <input 
                        type="number" 
                        placeholder="例如: 600"
                        value={config.minViolationCost}
                        onChange={(e) => setConfig({ ...config, minViolationCost: e.target.value })}
                        className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    </div>
                </div>
              </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex justify-between border-t gap-3">
          <button 
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm flex items-center"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            重置
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
          >
            应用筛选
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
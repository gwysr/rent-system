import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Palette, AlertTriangle, LayoutTemplate, ArrowUp, ArrowDown, Plus, Minus, GripVertical, CheckCircle2 } from 'lucide-react';
import { ColorSettings, HighlightRule, CardField } from '../types';

interface Props {
  isOpen: boolean;
  currentSettings: ColorSettings;
  onClose: () => void;
  onSave: (settings: ColorSettings) => void;
}

const DEFAULT_COLORS: ColorSettings = {
  riskColor: '#ef4444',
  dueColor: '#f59e0b',
  severeColor: '#7e22ce',
  highlightRule: 'smart_tiered',
  cardFields: ['financials', 'dates', 'violations_active', 'tags']
};

const FIELD_LABELS: Record<CardField, string> = {
    financials: '实付/应付金额 (半宽)',
    dates: '日期信息 (半宽)',
    violations_active: '当前违章详情 (全宽)',
    violations_history: '历史违章统计 (全宽)',
    tags: '风险提示标签 (全宽)'
};

const ALL_FIELDS: CardField[] = ['financials', 'dates', 'violations_active', 'violations_history', 'tags'];

const ColorSettingsModal: React.FC<Props> = ({ isOpen, currentSettings, onClose, onSave }) => {
  const [settings, setSettings] = useState<ColorSettings>(DEFAULT_COLORS);

  useEffect(() => {
    if (isOpen) {
      setSettings({
          ...DEFAULT_COLORS,
          ...currentSettings
      });
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleReset = () => {
    setSettings(DEFAULT_COLORS);
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...settings.cardFields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    setSettings({ ...settings, cardFields: newFields });
  };

  const moveDown = (index: number) => {
    if (index === settings.cardFields.length - 1) return;
    const newFields = [...settings.cardFields];
    [newFields[index + 1], newFields[index]] = [newFields[index], newFields[index + 1]];
    setSettings({ ...settings, cardFields: newFields });
  };

  const removeField = (field: CardField) => {
    setSettings({
        ...settings,
        cardFields: settings.cardFields.filter(f => f !== field)
    });
  };

  const addField = (field: CardField) => {
    if (settings.cardFields.includes(field)) return;
    setSettings({
        ...settings,
        cardFields: [...settings.cardFields, field]
    });
  };

  const hiddenFields = ALL_FIELDS.filter(f => !settings.cardFields.includes(f));

  const rules: { id: HighlightRule; label: string; desc: string }[] = [
      { id: 'smart_tiered', label: '智能分级 (推荐)', desc: '紫色:总欠款≥1300 / 红色:欠租≥周租金 / 黄色:今日到期' },
      { id: 'rent_total_1000', label: '旧版: 欠租总额 ≥ 1000', desc: '本期欠租+往期逾期超过1000时红框高亮' },
      { id: 'total_1200', label: '旧版: 总欠款 ≥ 1200', desc: '总欠款超过1200时红框高亮' },
  ];

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-fade"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-modal-pop">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold flex items-center text-gray-800">
            <Palette className="w-6 h-6 mr-3 text-brand-600" />
            显示与颜色配置
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto no-scrollbar flex-1">
          {/* Card Layout Ordering */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center text-sm">
                  <LayoutTemplate className="w-4 h-4 mr-2 text-brand-500" />
                  卡片显示内容排序
              </h3>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sortable List</span>
            </div>
            
            <div className="space-y-2 mb-4">
                {settings.cardFields.map((field, index) => (
                    <div key={field} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-brand-200 transition-all group">
                        <div className="flex items-center">
                            <GripVertical className="w-4 h-4 text-gray-200 mr-3 group-hover:text-brand-300" />
                            <span className="text-sm text-gray-700 font-bold">{FIELD_LABELS[field]}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveUp(index)} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-20 hover:bg-brand-50 rounded-lg transition-colors">
                                <ArrowUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => moveDown(index)} disabled={index === settings.cardFields.length - 1} className="p-1.5 text-gray-400 hover:text-brand-600 disabled:opacity-20 hover:bg-brand-50 rounded-lg transition-colors">
                                <ArrowDown className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-gray-100 mx-1"></div>
                            <button onClick={() => removeField(field)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Minus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {hiddenFields.length > 0 && (
                <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                    <div className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-tighter">点击快速添加</div>
                    <div className="flex flex-wrap gap-2">
                        {hiddenFields.map(field => (
                            <button key={field} onClick={() => addField(field)} className="flex items-center px-3 py-1.5 bg-white hover:bg-brand-600 hover:text-white text-gray-600 rounded-lg text-[11px] font-bold transition-all border border-gray-200 shadow-sm">
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                {FIELD_LABELS[field]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>

          <div className="border-t border-gray-100"></div>

          {/* Rules Selection */}
          <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center text-sm">
                    <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                    风险高亮触发逻辑
                </h3>
              </div>
              <div className="space-y-3">
                  {rules.map(rule => (
                      <label key={rule.id} className={`flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-all ${settings.highlightRule === rule.id ? 'bg-brand-50 border-brand-500 shadow-sm' : 'border-gray-100 hover:bg-gray-50'}`}>
                          <input type="radio" name="highlightRule" checked={settings.highlightRule === rule.id} onChange={() => setSettings({...settings, highlightRule: rule.id})} className="mt-1 mr-4 w-4 h-4 text-brand-600 focus:ring-brand-500" />
                          <div className="flex-1">
                              <div className="text-sm font-bold text-gray-800">{rule.label}</div>
                              <div className="text-xs text-gray-500 mt-1 leading-relaxed">{rule.desc}</div>
                          </div>
                      </label>
                  ))}
              </div>
          </div>

          {/* Color Definitions */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-5 text-sm flex items-center">
                  <Palette className="w-4 h-4 mr-2 text-gray-400" /> 风险颜色自定义
              </h3>
              <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">严重 (Severe)</label>
                    <div className="flex items-center gap-2 p-1 bg-white rounded-xl border shadow-sm">
                      <input type="color" value={settings.severeColor} onChange={(e) => setSettings(prev => ({ ...prev, severeColor: e.target.value }))} className="h-8 w-12 cursor-pointer border-none rounded-lg bg-transparent" />
                      <span className="text-[9px] font-mono font-bold text-gray-400 hidden sm:inline">{settings.severeColor.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">风险 (High)</label>
                    <div className="flex items-center gap-2 p-1 bg-white rounded-xl border shadow-sm">
                      <input type="color" value={settings.riskColor} onChange={(e) => setSettings(prev => ({ ...prev, riskColor: e.target.value }))} className="h-8 w-12 cursor-pointer border-none rounded-lg bg-transparent" />
                      <span className="text-[9px] font-mono font-bold text-gray-400 hidden sm:inline">{settings.riskColor.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">待交 (Due)</label>
                    <div className="flex items-center gap-2 p-1 bg-white rounded-xl border shadow-sm">
                      <input type="color" value={settings.dueColor} onChange={(e) => setSettings(prev => ({ ...prev, dueColor: e.target.value }))} className="h-8 w-12 cursor-pointer border-none rounded-lg bg-transparent" />
                      <span className="text-[9px] font-mono font-bold text-gray-400 hidden sm:inline">{settings.dueColor.toUpperCase()}</span>
                    </div>
                  </div>
              </div>
          </div>
        </div>

        <div className="p-5 bg-white border-t flex justify-between items-center sticky bottom-0">
          <button onClick={handleReset} className="px-4 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold flex items-center transition-all">
            <RotateCcw className="w-4 h-4 mr-2" />
            恢复默认
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold">
                取消
            </button>
            <button onClick={handleSave} className="px-8 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 text-sm font-bold shadow-lg shadow-brand-100 transition-all active:scale-95">
                保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorSettingsModal;
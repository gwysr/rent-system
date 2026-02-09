
import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, Clock, AlertCircle, Tag, Settings2, Check, GripVertical, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Memo, MemoPriority } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { formatFriendlyDate } from '../utils/calculations';

interface Props {
  isOpen: boolean;
  memos: Memo[];
  categories: string[];
  onClose: () => void;
  onUpdate: (memos: Memo[]) => void;
  onCategoriesUpdate: (categories: string[]) => void;
}

const MemoModal: React.FC<Props> = ({ isOpen, memos, categories, onClose, onUpdate, onCategoriesUpdate }) => {
  const [inputText, setInputText] = useState('');
  const [priority, setPriority] = useState<MemoPriority>('low');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');
  const [isInputExpanded, setIsInputExpanded] = useState(true);
  
  // 拖拽相关状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!inputText.trim()) return;
    const newMemo: Memo = {
      id: uuidv4(),
      text: inputText.trim(),
      isCompleted: false,
      priority,
      category: selectedCategory,
      createdAt: new Date().toISOString(),
      order: memos.length > 0 ? Math.min(...memos.map(m => m.order ?? 0)) - 1 : 0
    };
    onUpdate([newMemo, ...memos]);
    setInputText('');
    setPriority('low');
    setSelectedCategory(undefined);
  };

  const toggleComplete = (id: string) => {
    onUpdate(memos.map(m => m.id === id ? { ...m, isCompleted: !m.isCompleted } : m));
  };

  const deleteMemo = (id: string) => {
    onUpdate(memos.filter(m => m.id !== id));
  };

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    onCategoriesUpdate([...categories, name]);
    setNewCatName('');
  };

  const handleDeleteCategory = (cat: string) => {
    onCategoriesUpdate(categories.filter(c => c !== cat));
    if (selectedCategory === cat) setSelectedCategory(undefined);
    if (filterCategory === cat) setFilterCategory('all');
  };

  const getDisplayMemos = () => {
    let list = memos.filter(m => filterCategory === 'all' || m.category === filterCategory);
    return list.sort((a, b) => {
      // 增量修正：首要排序维度 - 完成状态沉降 (未完成 < 已完成)
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      
      // 次要排序维度 - 保持原有手动排序与时间权重
      const orderA = a.order ?? -new Date(a.createdAt).getTime();
      const orderB = b.order ?? -new Date(b.createdAt).getTime();
      return orderA - orderB;
    });
  };

  const displayMemos = getDisplayMemos();

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    const newList = [...displayMemos];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);
    const updatedMemos = memos.map(m => {
      const idxInSorted = newList.findIndex(item => item.id === m.id);
      if (idxInSorted !== -1) return { ...m, order: idxInSorted };
      return m;
    });
    onUpdate(updatedMemos);
    setDraggedIndex(null);
  };

  const getPriorityColor = (p: MemoPriority) => {
    switch (p) {
      case 'high': return 'text-red-500 bg-red-50 border-red-100';
      case 'medium': return 'text-orange-500 bg-orange-50 border-orange-100';
      default: return 'text-gray-500 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-backdrop-fade bg-black/60 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[92vh] animate-modal-pop border border-white/20">
        
        {/* Header: 紧凑化处理，减少垂直空间占用 */}
        <div className="px-8 py-4 border-b flex items-center justify-between bg-white sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded-xl shadow-md rotate-3">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">备忘记录中心</h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsInputExpanded(!isInputExpanded)}
              className="text-[10px] font-black text-gray-400 hover:text-brand-600 flex items-center gap-1 uppercase tracking-widest px-3 py-1 bg-gray-50 rounded-lg transition-all"
            >
              {isInputExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {isInputExpanded ? '收起录入' : '展开录入'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-900 border border-transparent">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 输入区：采用可折叠/精简设计，确保不占用核心列表面积 */}
        <div className={`transition-all duration-500 ease-in-out border-b bg-gray-50/30 overflow-hidden ${isInputExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 border-none'}`}>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-9 space-y-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在此输入待办..."
                  className="w-full p-4 border-2 border-transparent focus:border-yellow-400 rounded-2xl text-base font-bold focus:ring-4 focus:ring-yellow-400/10 outline-none resize-none h-24 bg-white shadow-sm transition-all placeholder:text-gray-300"
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleAdd(); }}
                />
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">标签:</span>
                     <div className="flex flex-wrap gap-1.5">
                        {categories.map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-all ${selectedCategory === cat ? 'bg-brand-600 text-white border-brand-700' : 'bg-white text-gray-500 border-gray-200 hover:border-brand-200 hover:text-brand-600'}`}
                          >
                            {cat}
                          </button>
                        ))}
                        <button 
                          onClick={() => setIsManagingCategories(!isManagingCategories)}
                          className={`p-1 rounded-lg transition-all ${isManagingCategories ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                     </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 flex flex-col justify-between py-1">
                 <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">紧急度</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['low', 'medium', 'high'] as MemoPriority[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={`h-10 rounded-xl border flex items-center justify-center transition-all ${
                            priority === p 
                              ? (p === 'high' ? 'bg-red-500 text-white border-red-600' : 
                                 p === 'medium' ? 'bg-orange-500 text-white border-orange-600' : 
                                 'bg-gray-800 text-white border-gray-900')
                              : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                 </div>

                 <button
                  onClick={handleAdd}
                  disabled={!inputText.trim()}
                  className="w-full h-12 mt-4 bg-yellow-400 hover:bg-yellow-500 text-white rounded-xl text-sm font-black shadow-lg shadow-yellow-200/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> 保存
                </button>
              </div>
            </div>

            {isManagingCategories && (
                <div className="mt-4 p-4 bg-white border-2 border-dashed border-gray-100 rounded-2xl">
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border rounded-lg">
                        <span className="text-xs font-bold text-gray-600">{cat}</span>
                        <button onClick={() => handleDeleteCategory(cat)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input 
                        value={newCatName} 
                        onChange={e => setNewCatName(e.target.value)} 
                        placeholder="新分类..." 
                        className="w-20 px-3 py-1 text-xs border rounded-lg focus:border-brand-500 outline-none"
                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                      />
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* 分类过滤器：改为更轻量的内嵌 Tab，进一步释放列表空间 */}
        <div className="px-8 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar bg-white border-b sticky top-0 z-20">
           <button 
              onClick={() => setFilterCategory('all')} 
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black border transition-all whitespace-nowrap shadow-sm flex items-center gap-1.5 ${filterCategory === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300'}`}
           >
             全部 <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${filterCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{memos.length}</span>
           </button>
           {categories.map(cat => (
             <button 
                key={cat}
                onClick={() => setFilterCategory(cat)} 
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black border transition-all whitespace-nowrap shadow-sm flex items-center gap-1.5 ${filterCategory === cat ? 'bg-brand-600 text-white border-brand-700' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-brand-300'}`}
             >
               {cat} <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${filterCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{memos.filter(m => m.category === cat).length}</span>
             </button>
           ))}
        </div>

        {/* 备忘录列表：核心展示区，占据绝大部分空间 (红框部分) */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gray-50/20 no-scrollbar">
          {displayMemos.map((memo, index) => (
            <div 
              key={memo.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`group flex items-start gap-6 p-6 rounded-[2rem] border-2 transition-all cursor-move active:scale-[0.99] relative ${
                memo.isCompleted ? 'bg-gray-50/50 border-gray-100 opacity-50 grayscale' : 'bg-white border-white shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:border-yellow-200'
              } ${draggedIndex === index ? 'opacity-20 border-dashed border-brand-400 scale-95' : ''}`}
            >
              <div className="mt-1.5 flex flex-col items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleComplete(memo.id); }}
                  className={`transition-all transform hover:scale-110 ${memo.isCompleted ? 'text-green-500' : 'text-gray-100 hover:text-yellow-400'}`}
                >
                  {memo.isCompleted ? <CheckCircle2 className="w-9 h-9" /> : <Circle className="w-9 h-9" />}
                </button>
                <div className="text-gray-100 group-hover:text-gray-200 p-1.5 rounded-lg bg-gray-50/50">
                  <GripVertical className="w-4 h-4" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                   {!memo.isCompleted && (
                     <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border shadow-sm ${getPriorityColor(memo.priority)}`}>
                        {memo.priority === 'high' ? '最高' : memo.priority === 'medium' ? '中等' : '普通'}
                     </span>
                   )}
                   {memo.category && (
                     <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-brand-50 text-brand-600 border border-brand-100 uppercase tracking-widest">
                        {memo.category}
                     </span>
                   )}
                   <span className="text-[10px] text-gray-300 font-bold flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />
                      {formatFriendlyDate(memo.createdAt)}
                   </span>
                </div>
                <p className={`text-lg leading-relaxed break-words whitespace-pre-wrap ${memo.isCompleted ? 'line-through text-gray-300 font-medium' : 'text-gray-800 font-black'}`}>
                  {memo.text}
                </p>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); deleteMemo(memo.id); }}
                className="opacity-0 group-hover:opacity-100 p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all self-center border border-transparent"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          {displayMemos.length === 0 && (
            <div className="py-24 text-center text-gray-300 flex flex-col items-center">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-inner border border-gray-50 mb-4">
                  <AlertCircle className="w-16 h-16 opacity-10" />
               </div>
               <p className="text-xl font-black text-gray-400">列表暂无内容</p>
               <p className="text-xs font-bold mt-1 opacity-60">点击顶部展开录入区开始记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoModal;

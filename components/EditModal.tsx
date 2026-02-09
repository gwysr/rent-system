import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { DriverRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  isOpen: boolean;
  initialData?: DriverRecord | null;
  onClose: () => void;
  onSave: (record: DriverRecord) => void;
}

const emptyRecord: DriverRecord = {
  id: '',
  name: '',
  licensePlate: '',
  contractStartDate: new Date().toISOString().split('T')[0],
  rentDuration: '',
  mode: 'kuaikuai',
  totalPayable: 3600,
  actualPaid: 0,
  overdueRentAmount: 0,
  violationCount: 0,
  violationPoints: 0,
  violationFine: 0,
  violationDeadline: '',
  historyViolationCount: 0,
  historyViolationPoints: 0,
  historyViolationFine: 0,
};

const EditModal: React.FC<Props> = ({ isOpen, initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState<DriverRecord>(emptyRecord);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { ...emptyRecord, id: uuidv4() });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-fade"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar animate-modal-pop">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {initialData ? '编辑司机信息' : '添加新司机'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">司机姓名</label>
              <input required name="name" value={formData.name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">车牌号</label>
              <input required name="licensePlate" value={formData.licensePlate} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模式 (Mode)</label>
                <select name="mode" value={formData.mode} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white">
                    <option value="kuaikuai">kuaikuai (快快)</option>
                    <option value="kuaiwen">kuaiwen (快文)</option>
                </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">租期 (月数)</label>
              <input name="rentDuration" value={formData.rentDuration || ''} onChange={handleChange} placeholder="如: 12" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">本月应付</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">¥</span>
                <input type="number" name="totalPayable" value={formData.totalPayable} onChange={handleChange} className="w-full border rounded-lg pl-6 pr-2 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">本月实付</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">¥</span>
                <input type="number" name="actualPaid" value={formData.actualPaid} onChange={handleChange} className="w-full border rounded-lg pl-6 pr-2 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>
            </div>
             <div>
              <label className="block text-sm font-bold text-red-600 mb-1">往期逾期</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-red-300 text-sm">¥</span>
                <input type="number" name="overdueRentAmount" value={formData.overdueRentAmount} onChange={handleChange} className="w-full border border-red-200 rounded-lg pl-6 pr-2 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-red-50 text-red-700" />
              </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">合同开始日期</label>
             <input type="date" name="contractStartDate" value={formData.contractStartDate} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
               当前未处理违章
               <span className="text-[10px] text-gray-400 font-normal">输入最新违章数据</span>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">条数</label>
                <input type="number" name="violationCount" value={formData.violationCount} onChange={handleChange} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">扣分</label>
                <input type="number" name="violationPoints" value={formData.violationPoints} onChange={handleChange} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">罚款</label>
                <input type="number" name="violationFine" value={formData.violationFine} onChange={handleChange} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">违章处理截止日期</label>
              <input type="date" name="violationDeadline" value={formData.violationDeadline || ''} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-400 mb-3">历史违章概览 (仅展示)</h3>
            <div className="grid grid-cols-3 gap-3">
               <input type="number" name="historyViolationCount" value={formData.historyViolationCount} onChange={handleChange} className="border rounded-lg px-2 py-1.5 text-sm bg-gray-50" placeholder="历史条数" />
               <input type="number" name="historyViolationPoints" value={formData.historyViolationPoints} onChange={handleChange} className="border rounded-lg px-2 py-1.5 text-sm bg-gray-50" placeholder="历史扣分" />
               <input type="number" name="historyViolationFine" value={formData.historyViolationFine} onChange={handleChange} className="border rounded-lg px-2 py-1.5 text-sm bg-gray-50" placeholder="历史罚款" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">取消</button>
            <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium flex items-center shadow-md">
              <Save className="w-4 h-4 mr-2" /> 保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
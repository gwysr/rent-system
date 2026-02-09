import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  driverName?: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteModal: React.FC<Props> = ({ isOpen, driverName, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-backdrop-fade"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-pop">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">确认删除?</h3>
          <p className="text-sm text-gray-500 mb-6">
            您确定要删除司机 <span className="font-bold text-gray-800">{driverName}</span> 吗？
            <br />此操作无法撤销。
          </p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-bold"
            >
              取消
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-bold shadow-lg shadow-red-200"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
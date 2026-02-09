
import React, { useRef, useState } from 'react';
import XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, AlertCircle, HelpCircle, FileWarning, Code } from 'lucide-react';
import { DriverRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  isOpen: boolean;
  mode: 'full' | 'violations';
  onClose: () => void;
  onImport: (data: DriverRecord[]) => void;
}

const ImportModal: React.FC<Props> = ({ isOpen, mode, onClose, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importType, setImportType] = useState<'excel' | 'json'>('excel');
  const [jsonText, setJsonText] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        processExcelData(data);
      } catch (err) {
        setError("无法解析文件，请确保是有效的Excel文件。");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processExcelData = (rows: any[]) => {
    if (rows.length < 2) {
      setError("数据行数不足");
      return;
    }

    const headers = (rows[0] as string[]).map(h => String(h).trim());
    const findIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const companyIdx = findIdx(['公司', 'Company']);
    const nameIdx = findIdx(['承租人', '司机', '姓名', 'Name']);
    const plateIdx = findIdx(['车牌', 'Plate', 'No']);
    const contractDateIdx = findIdx(['合同开始日期', '开始日期', 'Start Date', '日期']);
    const rentIdx = findIdx(['租金', '应付', 'Rent', 'Payable']);
    const overdueIdx = findIdx(['逾期', '往期欠租', 'Overdue']);
    const durationIdx = findIdx(['租期', '期限', 'Term', 'Duration', 'Months']);
    const vCountIdx = findIdx(['违章条数', '违章数']);
    const vPointsIdx = findIdx(['违章扣分', '扣分', '记分']);
    const vFineIdx = findIdx(['罚款', '违章罚款']);
    const vHistoryIdx = findIdx(['历史违章']);
    const vDeadlineIdx = findIdx(['截止时间', '截至时间', 'Deadline', '处理截止']);

    if (nameIdx === -1 || plateIdx === -1) {
      setError(`无法识别关键列。请确保表头包含: 承租人, 车牌`);
      return;
    }

    const parseDate = (val: any) => {
       if (!val) return undefined;
       let dateStr = "";
       if (typeof val === 'number') {
          const dateInfo = XLSX.SSF.parse_date_code(val);
          if (dateInfo) {
            const y = dateInfo.y;
            const m = String(dateInfo.m).padStart(2, '0');
            const d = String(dateInfo.d).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
          }
       } else {
          const dStr = String(val).trim();
          const match = dStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
          if (match) {
              const y = match[1];
              const m = match[2].padStart(2, '0');
              const d = match[3].padStart(2, '0');
              dateStr = `${y}-${m}-${d}`;
          } else {
              const d = new Date(dStr);
              if (!isNaN(d.getTime())) {
                 const y = d.getFullYear();
                 const m = String(d.getMonth() + 1).padStart(2, '0');
                 const day = String(d.getDate()).padStart(2, '0');
                 dateStr = `${y}-${m}-${day}`;
              }
          }
       }
       return dateStr;
    }

    const parsed: DriverRecord[] = rows.slice(1).map((row: any) => {
      if (!row[nameIdx] && !row[plateIdx]) return null;
      let contractDate = new Date().toISOString().split('T')[0];
      if (contractDateIdx !== -1 && row[contractDateIdx]) {
         const d = parseDate(row[contractDateIdx]);
         if (d) contractDate = d;
      }

      let mode: 'kuaikuai' | 'kuaiwen' = 'kuaikuai';
      if (companyIdx !== -1 && row[companyIdx]) {
          const mVal = String(row[companyIdx]).toLowerCase();
          if (mVal.includes('文') || mVal.includes('wen') || mVal.includes('稳')) mode = 'kuaiwen';
      }

      const totalPayable = row[rentIdx] ? Number(row[rentIdx]) : 3600; 
      const overdueRent = overdueIdx !== -1 && row[overdueIdx] ? Number(row[overdueIdx]) : 0;
      const duration = durationIdx !== -1 && row[durationIdx] ? String(row[durationIdx]) : '';
      const vCount = vCountIdx !== -1 && row[vCountIdx] ? Number(row[vCountIdx]) : 0;
      const vPoints = vPointsIdx !== -1 && row[vPointsIdx] ? Number(row[vPointsIdx]) : 0;
      const vFine = vFineIdx !== -1 && row[vFineIdx] ? Number(row[vFineIdx]) : 0;
      
      let vDeadline: string | undefined = undefined;
      if (vDeadlineIdx !== -1 && row[vDeadlineIdx]) vDeadline = parseDate(row[vDeadlineIdx]);

      let hCount = 0, hPoints = 0, hFine = 0;
      if (vHistoryIdx !== -1 && row[vHistoryIdx]) {
          const hStr = String(row[vHistoryIdx]).trim();
          const parts = hStr.split(/[,，\s]+/);
          if (parts.length >= 1) hCount = Number(parts[0]) || 0;
          if (parts.length >= 2) hPoints = Number(parts[1]) || 0;
          if (parts.length >= 3) hFine = Number(parts[2]) || 0;
      }

      return {
        id: uuidv4(), 
        name: String(row[nameIdx] || '').trim(),
        licensePlate: String(row[plateIdx] || '').trim(),
        contractStartDate: contractDate,
        rentDuration: duration,
        mode: mode,
        totalPayable: totalPayable,
        actualPaid: 0, 
        overdueRentAmount: overdueRent,
        violationCount: vCount,
        violationPoints: vPoints, 
        violationFine: vFine,
        violationDeadline: vDeadline,
        historyViolationCount: hCount,
        historyViolationPoints: hPoints,
        historyViolationFine: hFine,
      };
    }).filter(Boolean) as DriverRecord[];

    if (parsed.length === 0) {
      setError("解析后没有有效数据，请检查Excel内容格式");
      return;
    }
    setPreview(parsed);
  };

  const handleJsonProcess = () => {
    setError(null);
    try {
      const raw = JSON.parse(jsonText);
      if (!raw.rows || !Array.isArray(raw.rows)) {
        throw new Error("JSON 结构不正确，缺少 rows 数组");
      }

      const parsed: DriverRecord[] = raw.rows.map((row: any) => ({
        id: uuidv4(),
        name: String(row.rentalDriverName || '').trim(),
        licensePlate: 'JSON_MATCH_ONLY', // 特殊标记，用于 App.tsx 逻辑
        contractStartDate: '',
        mode: 'kuaikuai',
        totalPayable: 0,
        actualPaid: 0,
        overdueRentAmount: 0,
        violationCount: Number(row.count) || 0,
        violationPoints: Number(row.penalty) || 0,
        violationFine: Number(row.fines) || 0,
        historyViolationCount: 0,
        historyViolationPoints: 0,
        historyViolationFine: 0,
      }));

      if (parsed.length === 0) {
        setError("未发现有效的司机数据");
        return;
      }
      setPreview(parsed);
    } catch (err) {
      setError("JSON 解析失败: " + (err as Error).message);
    }
  };

  const confirmImport = () => {
    onImport(preview);
    onClose();
    setPreview([]);
    setJsonText('');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-fade"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-modal-pop">
        <div className={`flex items-center justify-between p-4 border-b ${mode === 'violations' ? 'bg-orange-50' : 'bg-white'}`}>
          <h2 className={`text-lg font-bold flex items-center ${mode === 'violations' ? 'text-orange-800' : 'text-gray-900'}`}>
            {mode === 'violations' ? (
                <>
                    <FileWarning className="w-5 h-5 mr-2 text-orange-600" />
                    导入/更新违章数据
                </>
            ) : (
                <>
                    <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
                    Excel 导入 (完整数据)
                </>
            )}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'violations' && (
             <div className="mb-6 flex p-1 bg-gray-100 rounded-xl">
                <button 
                  onClick={() => {setImportType('excel'); setPreview([]);}}
                  className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${importType === 'excel' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Excel 导入
                </button>
                <button 
                  onClick={() => {setImportType('json'); setPreview([]);}}
                  className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${importType === 'json' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Code className="w-3.5 h-3.5 mr-2" /> JSON 文本粘贴
                </button>
             </div>
          )}

          {!preview.length ? (
            <>
              {importType === 'excel' ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors mb-4">
                  <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className={`px-6 py-3 text-white rounded-lg transition font-medium ${mode === 'violations' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-brand-600 hover:bg-brand-700'}`}>
                    点击上传 Excel 文件
                  </button>
                  <p className="text-gray-500 text-sm mt-3">支持 .xlsx, .xls</p>
                </div>
              ) : (
                <div className="space-y-4 mb-4">
                   <textarea 
                     value={jsonText}
                     onChange={(e) => setJsonText(e.target.value)}
                     placeholder="在此粘贴 JSON 原始文本..."
                     className="w-full h-48 p-4 bg-gray-900 text-green-400 font-mono text-xs rounded-xl border-none focus:ring-2 focus:ring-orange-500 outline-none shadow-inner"
                   />
                   <button 
                     onClick={handleJsonProcess}
                     disabled={!jsonText.trim()}
                     className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                   >
                     解析 JSON 数据
                   </button>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-800 flex items-start">
                 <HelpCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                 <div>
                    <p className="font-bold mb-1">{importType === 'excel' ? '支持的表头 (模糊匹配):' : 'JSON 导入说明:'}</p>
                    {importType === 'excel' ? (
                       <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <div>公司 / 承租人 / 车牌</div>
                          <div>合同开始日期 (必填)</div>
                          <div>租期 / 租金 / 逾期</div>
                          <div>违章 / 历史违章 / 截止时间</div>
                       </div>
                    ) : (
                       <p>系统将自动根据 <b>rentalDriverName</b> 匹配现有记录，并更新违章数(count)、记分(penalty)和罚款(fines)。</p>
                    )}
                 </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700 font-medium">解析成功: {preview.length} 条</span>
                  <button onClick={() => {setPreview([]); setJsonText('');}} className="text-red-500 hover:underline">清空重传</button>
               </div>
              <div className="max-h-64 overflow-y-auto border rounded text-xs no-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2">姓名</th>
                      <th className="p-2">违章数</th>
                      <th className="p-2">扣分</th>
                      <th className="p-2">罚款</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2 font-medium">{r.name}</td>
                        <td className="p-2 text-red-600">{r.violationCount}</td>
                        <td className="p-2 text-orange-600">{r.violationPoints}</td>
                        <td className="p-2">¥{r.violationFine}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm">取消</button>
          <button onClick={confirmImport} disabled={!preview.length} className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 text-sm font-medium ${mode === 'violations' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-brand-600 hover:bg-brand-700'}`}>
            {mode === 'violations' ? '确认更新' : '确认导入'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;

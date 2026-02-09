

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Filter, LayoutGrid, Calendar as CalendarIcon, Wallet, Users, ChevronDown, Check, FileWarning, Palette, FileDown, Download, HardDrive, RotateCcw, StickyNote, Trash2, AlertCircle, BellOff, Bell, ShieldAlert, Maximize2, Receipt, RefreshCw } from 'lucide-react';
import DriverCard from './components/DriverCard';
import ImportModal from './components/ImportModal';
import EditModal from './components/EditModal';
import ApiConfigModal from './components/ApiConfigModal';
import ViolationSyncModal from './components/ViolationSyncModal'; // NEW
import DeleteModal from './components/DeleteModal';
import ColorSettingsModal from './components/ColorSettingsModal';
import FilterModal from './components/FilterModal';
import DetailsModal from './components/DetailsModal';
import MemoModal from './components/MemoModal';
import { DriverRecord, ColorSettings, Memo, RiskLevel } from './types';
import { calculateBillingStatus, getLocalDateString, matchFuzzy } from './utils/calculations';
import { v4 as uuidv4 } from 'uuid';
import XLSX from 'xlsx';

// Sample Data
const initialData: DriverRecord[] = [
  {
    id: uuidv4(),
    name: '张三 (演示数据)',
    licensePlate: '粤ADX8576',
    contractStartDate: '2023-11-22',
    rentDuration: '12',
    mode: 'kuaikuai',
    violationMode: 'kuaikuai',
    totalPayable: 3600,
    actualPaid: 900,
    overdueRentAmount: 0,
    violationCount: 0,
    violationPoints: 0,
    violationFine: 0,
    historyViolationCount: 6,
    historyViolationPoints: 4,
    historyViolationFine: 1050
  }
];

const STORAGE_PREFIX = 'RENT_COLLECTOR_DATA_';
const MEMO_PREFIX = 'RENT_COLLECTOR_MEMO_';
const CATEGORY_PREFIX = 'RENT_COLLECTOR_CATS_'; 
const PROFILE_LIST_KEY = 'RENT_COLLECTOR_PROFILES';
const CURRENT_PROFILE_KEY = 'RENT_COLLECTOR_CURRENT_PROFILE';
const COLORS_PREFIX = 'RENT_COLLECTOR_COLORS_';

const DEFAULT_COLORS: ColorSettings = {
  riskColor: '#ef4444',
  dueColor: '#f59e0b',
  severeColor: '#7e22ce',
  highlightRule: 'smart_tiered',
  cardFields: ['financials', 'dates', 'violations_active', 'tags']
};

const DEFAULT_CATEGORIES = ['需断电', '需发函', '需风控'];

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<string[]>(() => {
    try {
        const saved = localStorage.getItem(PROFILE_LIST_KEY);
        return saved ? JSON.parse(saved) : ['默认账本'];
    } catch { return ['默认账本']; }
  });
  
  const [currentProfile, setCurrentProfile] = useState<string>(() => {
     return localStorage.getItem(CURRENT_PROFILE_KEY) || '默认账本';
  });

  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<DriverRecord[]>([]);
  const [colorSettings, setColorSettings] = useState<ColorSettings>(DEFAULT_COLORS);
  
  const [memos, setMemos] = useState<Memo[]>([]);
  const [memoCategories, setMemoCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isMemoOpen, setMemoOpen] = useState(false);

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConfig, setFilterConfig] = useState({ minArrears: '', minViolationCost: '', minTotalDebt: '' });
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'due' | null>(null);
  const [hideRemindStatus, setHideRemindStatus] = useState(false);

  useEffect(() => {
    if (!isProfileMenuOpen) {
        setIsCreatingProfile(false);
        setNewProfileName('');
    }
  }, [isProfileMenuOpen]);

  useEffect(() => {
    try {
        const dataKey = `${STORAGE_PREFIX}${currentProfile}`;
        const savedData = localStorage.getItem(dataKey);
        if (savedData) {
            setRecords(JSON.parse(savedData));
        } else {
            setRecords(currentProfile === '默认账本' ? initialData : []);
        }

        const colorKey = `${COLORS_PREFIX}${currentProfile}`;
        const savedColors = localStorage.getItem(colorKey);
        if (savedColors) {
            setColorSettings({ ...DEFAULT_COLORS, ...JSON.parse(savedColors) });
        } else {
            setColorSettings(DEFAULT_COLORS);
        }

        const memoKey = `${MEMO_PREFIX}${currentProfile}`;
        const savedMemos = localStorage.getItem(memoKey);
        if (savedMemos) {
            setMemos(JSON.parse(savedMemos));
        } else {
            setMemos([]);
        }

        const catKey = `${CATEGORY_PREFIX}${currentProfile}`;
        const savedCats = localStorage.getItem(catKey);
        if (savedCats) {
            setMemoCategories(JSON.parse(savedCats));
        } else {
            setMemoCategories(DEFAULT_CATEGORIES);
        }
    } catch (error) {
        console.error("Failed to load profile data", error);
        setRecords([]);
        setColorSettings(DEFAULT_COLORS);
        setMemos([]);
        setMemoCategories(DEFAULT_CATEGORIES);
    }
    localStorage.setItem(CURRENT_PROFILE_KEY, currentProfile);
    setRiskFilter(null); 
  }, [currentProfile]);

  useEffect(() => {
     if (!currentProfile) return;
     const key = `${STORAGE_PREFIX}${currentProfile}`;
     localStorage.setItem(key, JSON.stringify(records));
  }, [records, currentProfile]);

  useEffect(() => {
     if (!currentProfile) return;
     const key = `${COLORS_PREFIX}${currentProfile}`;
     localStorage.setItem(key, JSON.stringify(colorSettings));
  }, [colorSettings, currentProfile]);

  useEffect(() => {
     if (!currentProfile) return;
     const key = `${MEMO_PREFIX}${currentProfile}`;
     localStorage.setItem(key, JSON.stringify(memos));
  }, [memos, currentProfile]);

  useEffect(() => {
    if (!currentProfile) return;
    const key = `${CATEGORY_PREFIX}${currentProfile}`;
    localStorage.setItem(key, JSON.stringify(memoCategories));
  }, [memoCategories, currentProfile]);

  useEffect(() => {
      localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(profiles));
  }, [profiles]);

  const confirmCreateProfile = () => {
      const name = newProfileName.trim();
      if (!name) return;
      if (profiles.includes(name)) {
          alert("该名称已存在");
          return;
      }
      setProfiles([...profiles, name]);
      setCurrentProfile(name);
      setProfileMenuOpen(false);
      setIsCreatingProfile(false);
      setNewProfileName('');
  };

  const handleSwitchProfile = (name: string) => {
      setCurrentProfile(name);
      setProfileMenuOpen(false);
  };

  const handleDeleteProfile = (e: React.MouseEvent, name: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (e.nativeEvent.stopImmediatePropagation) {
        e.nativeEvent.stopImmediatePropagation();
      }

      if (profiles.length <= 1) {
          alert("抱歉，这是最后一个账本，无法删除。");
          return;
      }

      const isConfirmed = window.confirm(`警告：确定要永久删除账本「${name}」吗？\n该操作将清除此账本下的所有数据，且不可撤销！`);
      
      if (!isConfirmed) return;

      const nextProfiles = profiles.filter(p => p !== name);
      
      localStorage.removeItem(`${STORAGE_PREFIX}${name}`);
      localStorage.removeItem(`${COLORS_PREFIX}${name}`);
      localStorage.removeItem(`${MEMO_PREFIX}${name}`);
      localStorage.removeItem(`${CATEGORY_PREFIX}${name}`);

      setProfiles(nextProfiles);

      if (currentProfile === name) {
          setCurrentProfile(nextProfiles[0]);
      }
  };

  const handleBackupData = () => {
      const backupData: Record<string, any> = {};
      backupData[PROFILE_LIST_KEY] = localStorage.getItem(PROFILE_LIST_KEY);
      backupData[CURRENT_PROFILE_KEY] = localStorage.getItem(CURRENT_PROFILE_KEY);
      profiles.forEach(p => {
          const dKey = `${STORAGE_PREFIX}${p}`;
          const cKey = `${COLORS_PREFIX}${p}`;
          const mKey = `${MEMO_PREFIX}${p}`;
          const catKey = `${CATEGORY_PREFIX}${p}`;
          backupData[dKey] = localStorage.getItem(dKey);
          backupData[cKey] = localStorage.getItem(cKey);
          backupData[mKey] = localStorage.getItem(mKey);
          backupData[catKey] = localStorage.getItem(catKey);
      });
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `FleetGuard_全站备份_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setProfileMenuOpen(false);
  };

  const handleRestoreClick = () => {
      restoreInputRef.current?.click();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const jsonStr = evt.target?.result as string;
              const data = JSON.parse(jsonStr);
              
              const importedProfileListRaw = data[PROFILE_LIST_KEY];
              if (!importedProfileListRaw) throw new Error("无效的数据文件");
              
              const importedProfiles: string[] = JSON.parse(importedProfileListRaw);
              const currentProfiles = [...profiles];
              let addedCount = 0;

              importedProfiles.forEach(pName => {
                  let finalName = pName;
                  if (currentProfiles.includes(pName)) {
                      finalName = `${pName}_导入_${Date.now().toString().slice(-4)}`;
                  }
                  
                  currentProfiles.push(finalName);
                  addedCount++;

                  const dKey = `${STORAGE_PREFIX}${pName}`;
                  const cKey = `${COLORS_PREFIX}${pName}`;
                  const mKey = `${MEMO_PREFIX}${pName}`;
                  const catKey = `${CATEGORY_PREFIX}${pName}`;

                  if (data[dKey]) localStorage.setItem(`${STORAGE_PREFIX}${finalName}`, data[dKey]);
                  if (data[cKey]) localStorage.setItem(`${COLORS_PREFIX}${finalName}`, data[cKey]);
                  if (data[mKey]) localStorage.setItem(`${MEMO_PREFIX}${finalName}`, data[mKey]);
                  if (data[catKey]) localStorage.setItem(`${CATEGORY_PREFIX}${finalName}`, data[catKey]);
              });

              setProfiles(currentProfiles);
              alert(`成功！已增量合并 ${addedCount} 个新账本，现有数据完好无损。`);
              
          } catch (err) {
              alert("导入失败，文件内容不兼容。");
              console.error(err);
          }
      };
      reader.readAsText(file);
      e.target.value = '';
      setProfileMenuOpen(false);
  };

  const [isImportOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'full' | 'violations'>('full');
  const [isEditOpen, setEditOpen] = useState(false);
  
  // Sync Modal States
  const [syncState, setSyncState] = useState<{isOpen: boolean; isMinimized: boolean}>({ isOpen: false, isMinimized: false });
  const [violationSyncState, setViolationSyncState] = useState<{isOpen: boolean; isMinimized: boolean}>({ isOpen: false, isMinimized: false });
  const [violationProgress, setViolationProgress] = useState({ current: 0, total: 0 }); // New progress state

  const [isColorModalOpen, setColorModalOpen] = useState(false);
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [syncTargetRecords, setSyncTargetRecords] = useState<DriverRecord[]>([]);
  const [violationSyncTargetRecords, setViolationSyncTargetRecords] = useState<DriverRecord[]>([]); // New
  
  const [deleteData, setDeleteData] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });
  const [editingRecord, setEditingRecord] = useState<DriverRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<DriverRecord | null>(null);

  const getRiskScore = (record: DriverRecord, status: any, hideRemind: boolean) => {
    let score = 0;
    // 逻辑无损：仅在开关未开启时，给未催办的催缴卡片增加置顶权重
    if (!hideRemind && !status.isReminded) {
        if (status.isDueDay) score += 1000000;      
        if (status.isPreDueDay) score += 500000;    
    }
    if (status.riskLevel === 'severe') score += 50000;
    if (status.riskLevel === 'high') score += 10000;
    score += status.totalDebt;
    return score;
  };

  const baseFilteredRecords = useMemo(() => {
    let filtered = records.filter(r => matchFuzzy(searchTerm, r));
    
    if (filterConfig.minArrears || filterConfig.minViolationCost || filterConfig.minTotalDebt) {
       filtered = filtered.filter(r => {
           const status = calculateBillingStatus(r);
           const minArr = Number(filterConfig.minArrears);
           const minVio = Number(filterConfig.minViolationCost);
           const minTot = Number(filterConfig.minTotalDebt);
           const matchesArrears = !filterConfig.minArrears || status.arrearsAmount >= minArr;
           const matchesViolation = !filterConfig.minViolationCost || status.violationCost >= minVio;
           const matchesTotal = !filterConfig.minTotalDebt || status.totalDebt >= minTot;
           return matchesArrears && matchesViolation && matchesTotal;
       });
    }
    return filtered;
  }, [records, searchTerm, filterConfig]);

  const sortedRecords = useMemo(() => {
    let filtered = [...baseFilteredRecords];
    if (riskFilter) {
      filtered = filtered.filter(r => {
          const status = calculateBillingStatus(r, colorSettings.highlightRule);
          if (riskFilter === 'due') return status.isDueDay;
          return status.riskLevel === riskFilter;
      });
    }
    return filtered.sort((a, b) => {
      const statusA = calculateBillingStatus(a, colorSettings.highlightRule);
      const statusB = calculateBillingStatus(b, colorSettings.highlightRule);
      return getRiskScore(b, statusB, hideRemindStatus) - getRiskScore(a, statusA, hideRemindStatus);
    });
  }, [baseFilteredRecords, riskFilter, colorSettings.highlightRule, hideRemindStatus]);

  const severeCount = useMemo(() => baseFilteredRecords.filter(r => calculateBillingStatus(r, colorSettings.highlightRule).riskLevel === 'severe').length, [baseFilteredRecords, colorSettings.highlightRule]);
  const highCount = useMemo(() => baseFilteredRecords.filter(r => calculateBillingStatus(r, colorSettings.highlightRule).riskLevel === 'high').length, [baseFilteredRecords, colorSettings.highlightRule]);
  const dueCount = useMemo(() => baseFilteredRecords.filter(r => {
      const status = calculateBillingStatus(r);
      return status.isDueDay;
  }).length, [baseFilteredRecords]);

  const toggleRiskFilter = (level: RiskLevel | 'due') => {
    setRiskFilter(prev => prev === level ? null : level);
  };

  const handleExportHistory = () => {
    if (records.length === 0) { alert("暂无数据可导出"); return; }
    let minDate = new Date();
    let hasValidDate = false;
    records.forEach(r => {
        const d = new Date(r.contractStartDate);
        if (!isNaN(d.getTime())) { if (d < minDate) minDate = d; hasValidDate = true; }
    });
    const monthKeys: Date[] = [];
    const now = new Date();
    let cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= end) { monthKeys.push(new Date(cursor)); cursor.setMonth(cursor.getMonth() + 1); }
    const row0: any[] = ['基本信息', null, null, null, null, null]; // Increased col
    const row1: any[] = ['承租人', '车牌', '合同开始日期', '租期(月)', '违章模式', '月租金'];
    const merges: XLSX.Range[] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } } ];
    
    // 渲染历史周级账单表头
    monthKeys.forEach((m, idx) => {
        const monthLabel = `${m.getFullYear()}年${m.getMonth() + 1}月账单`;
        row0.push(monthLabel, null, null, null, null, null, null, null);
        row1.push('第一周', '实付', '第二周', '实付', '第三周', '实付', '第四周', '实付');
        const startCol = 6 + (idx * 8);
        const endCol = startCol + 7;
        merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: endCol } });
    });

    // --- 增量代码：追加实时状态汇总表头 ---
    const summaryStartCol = 6 + (monthKeys.length * 8);
    row0.push('实时状态汇总', null, null, null, null, null, null);
    row1.push('违章条数', '违章扣分', '违章罚款', '违章处理费', '本期欠租', '往期逾期', '实时总欠款');
    merges.push({ s: { r: 0, c: summaryStartCol }, e: { r: 0, c: summaryStartCol + 6 } });

    const exportData: any[] = [row0, row1];
    records.forEach(record => {
        const rowData: any[] = [ 
            record.name, 
            record.licensePlate, 
            record.contractStartDate, 
            record.rentDuration || '-', 
            record.violationMode || record.mode, // NEW column
            record.totalPayable 
        ];
        const start = new Date(record.contractStartDate);
        const contractStartMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        
        // 渲染历史账单数据
        monthKeys.forEach(m => {
            if (m < contractStartMonth) { rowData.push('-', '-', '-', '-', '-', '-', '-', '-'); return; }
            const year = m.getFullYear();
            const month = m.getMonth() + 1; 
            const isCurrentMonth = (year === now.getFullYear() && (month - 1) === now.getMonth());
            let monthlyActualPaid = record.totalPayable; 
            const overdueBill = record.apiOverdueDetails?.find((b: any) => {
                const d = new Date(b.shouldPayDate); 
                return d.getFullYear() === (month === 12 ? year + 1 : year) && (d.getMonth() + 1) === (month === 12 ? 1 : month + 1);
            });
            if (overdueBill) {
                monthlyActualPaid = Math.max(0, record.totalPayable - (Number(overdueBill.shouldPayAmount) - Number(overdueBill.alreadyPayAmount)));
            } else if (isCurrentMonth) {
                monthlyActualPaid = record.actualPaid;
            }
            const w1Pay = record.totalPayable * 0.25;
            const w2Pay = record.totalPayable * 0.50;
            const w3Pay = record.totalPayable * 0.75;
            const w4Pay = record.totalPayable * 1.00;
            const formatPaid = (actual: number, threshold: number) => {
                return actual >= threshold ? '已交' : actual;
            };
            rowData.push(
                w1Pay.toFixed(0), formatPaid(monthlyActualPaid, w1Pay),
                w2Pay.toFixed(0), formatPaid(monthlyActualPaid, w2Pay),
                w3Pay.toFixed(0), formatPaid(monthlyActualPaid, w3Pay),
                w4Pay.toFixed(0), formatPaid(monthlyActualPaid, w4Pay)
            );
        });

        // --- 增量代码：追加实时状态统计数据 ---
        const status = calculateBillingStatus(record, colorSettings.highlightRule);
        const violationProcessingFee = record.violationPoints * 200;
        rowData.push(
            record.violationCount,
            record.violationPoints,
            record.violationFine,
            violationProcessingFee,
            status.currentCycleArrears.toFixed(0),
            record.overdueRentAmount,
            status.totalDebt.toFixed(0)
        );

        exportData.push(rowData);
    });
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    ws['!merges'] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "周级账单明细");
    XLSX.writeFile(wb, `FleetGuard_账单报表_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAdd = () => { setEditingRecord(null); setEditOpen(true); };
  const handleEdit = (record: DriverRecord) => { setEditingRecord(record); setEditOpen(true); };
  const handleSave = (record: DriverRecord) => {
    if (editingRecord) setRecords(prev => prev.map(r => r.id === record.id ? record : r));
    else setRecords(prev => [...prev, { ...record, id: uuidv4() }]);
  };

  const handleRemind = (record: DriverRecord) => {
    const today = getLocalDateString(new Date());
    setRecords(prev => prev.map(r => 
      r.id === record.id 
        ? { ...r, lastRemindedDate: r.lastRemindedDate === today ? undefined : today } 
        : r
    ));
  };

  const handleDeleteRequest = (id: string) => {
    const record = records.find(r => r.id === id);
    if (record) setDeleteData({ isOpen: true, id, name: record.name });
  };
  const confirmDelete = () => {
    setRecords(prev => prev.filter(r => r.id !== deleteData.id));
    setDeleteData({ isOpen: false, id: '', name: '' });
  };

  const handleImport = (importedRecords: DriverRecord[]) => {
    setRecords(prevRecords => {
      const updatedIds = new Set<string>();
      const newPrevRecords = [...prevRecords];
      importedRecords.forEach(newRecord => {
        if (importMode === 'violations') {
          let existingIdx = newPrevRecords.findIndex(r => r.licensePlate.trim() === newRecord.licensePlate.trim() && r.name.trim() === newRecord.name.trim());
          if (existingIdx === -1 && newRecord.licensePlate === 'JSON_MATCH_ONLY') {
            existingIdx = newPrevRecords.findIndex(r => r.name.trim() === newRecord.name.trim());
          }
          if (existingIdx !== -1) {
            const existing = newPrevRecords[existingIdx];
            newPrevRecords[existingIdx] = {
              ...existing,
              violationCount: newRecord.violationCount,
              violationPoints: newRecord.violationPoints,
              violationFine: newRecord.violationFine,
              violationDeadline: newRecord.licensePlate === 'JSON_MATCH_ONLY' ? existing.violationDeadline : newRecord.violationDeadline,
              historyViolationCount: newRecord.historyViolationCount || existing.historyViolationCount,
              historyViolationPoints: newRecord.historyViolationPoints || existing.historyViolationPoints,
              historyViolationFine: newRecord.historyViolationFine || existing.historyViolationFine,
            };
            updatedIds.add(existing.id);
          }
        } else {
          const existingIdx = newPrevRecords.findIndex(r => r.licensePlate.trim() === newRecord.licensePlate.trim() && r.name.trim() === newRecord.name.trim());
          if (existingIdx !== -1) {
            newPrevRecords[existingIdx] = { ...newPrevRecords[existingIdx], ...newRecord, id: newPrevRecords[existingIdx].id };
            updatedIds.add(newPrevRecords[existingIdx].id);
          } else { newPrevRecords.push(newRecord); }
        }
      });
      return newPrevRecords;
    });
    setImportOpen(false);
  };
  
  const openImportModal = (mode: 'full' | 'violations') => { setImportMode(mode); setImportOpen(true); };
  
  // Sync Handlers
  const handleGlobalSync = () => { setSyncTargetRecords(records); setSyncState({ isOpen: true, isMinimized: false }); };
  const handleSingleSync = (record: DriverRecord) => { setSyncTargetRecords([record]); setSyncState({ isOpen: true, isMinimized: false }); };
  const handleApiSyncComplete = (updatedFromApi: DriverRecord[]) => {
    setRecords(prev => prev.map(existing => updatedFromApi.find(u => u.id === existing.id) || existing));
  };

  // Violation Sync Handlers
  const handleGlobalViolationSync = () => { setViolationSyncTargetRecords(records); setViolationSyncState({ isOpen: true, isMinimized: false }); };
  const handleSingleViolationSync = (record: DriverRecord) => { setViolationSyncTargetRecords([record]); setViolationSyncState({ isOpen: true, isMinimized: false }); };
  const handleViolationSyncComplete = (updatedFromApi: DriverRecord[]) => {
    setRecords(prev => prev.map(existing => updatedFromApi.find(u => u.id === existing.id) || existing));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" onClick={() => setProfileMenuOpen(false)}>
      <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestoreFile} />

      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-lg"> <LayoutGrid className="text-white w-6 h-6" /> </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">FleetGuard</h1>
            
            <div className="relative ml-4 z-[30]" onClick={e => e.stopPropagation()}>
                <button 
                  type="button"
                  onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold text-gray-700 transition-all border border-transparent hover:border-gray-300"
                >
                    <Users className="w-4 h-4 text-gray-500" /> {currentProfile} <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                
                {isProfileMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                        <div className="p-3 border-b bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">切换工作账本</div>
                        <div className="max-h-64 overflow-y-auto no-scrollbar">
                            {profiles.map(p => (
                                <div key={p} className="group relative flex items-center">
                                    <button 
                                        type="button"
                                        onClick={() => handleSwitchProfile(p)} 
                                        className={`flex-1 text-left px-4 py-3.5 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${currentProfile === p ? 'bg-blue-50 text-brand-700 font-black' : 'text-gray-700 font-medium'}`}
                                    >
                                        <span className="truncate pr-10 tracking-tight">{p}</span>
                                        {currentProfile === p && <Check className="w-4 h-4 shrink-0" />}
                                    </button>
                                    {profiles.length > 1 && (
                                        <button 
                                            type="button"
                                            onClick={(e) => handleDeleteProfile(e, p)}
                                            className="absolute right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-[110] cursor-pointer active:scale-95"
                                            title="永久删除此账本"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t bg-gray-50">
                            {!isCreatingProfile ? (
                                <button 
                                  type="button"
                                  onClick={() => setIsCreatingProfile(true)} 
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-black text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
                                > 
                                  <Plus className="w-3.5 h-3.5" /> 新建账本 
                                </button>
                            ) : (
                                <div className="space-y-2 p-1">
                                    <input autoFocus value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="账本名称..." className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-bold" onKeyDown={(e) => { if (e.key === 'Enter') confirmCreateProfile(); if (e.key === 'Escape') setIsCreatingProfile(false); }} />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={confirmCreateProfile} disabled={!newProfileName.trim()} className="flex-1 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"> 创建 </button>
                                        <button type="button" onClick={() => setIsCreatingProfile(false)} className="flex-1 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"> 取消 </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between"> 数据备份与同步 <HardDrive className="w-3 h-3" /> </div>
                        <div className="p-2 grid grid-cols-2 gap-2 bg-white">
                             <button type="button" onClick={handleBackupData} className="flex flex-col items-center justify-center p-2.5 border rounded-xl hover:bg-brand-50 hover:border-brand-200 text-gray-500 hover:text-brand-700 transition-all"> <Download className="w-4 h-4 mb-1" /> <span className="text-[10px] font-bold">备份导出</span> </button>
                             <button type="button" onClick={handleRestoreClick} className="flex flex-col items-center justify-center p-2.5 border rounded-xl hover:bg-orange-50 hover:border-orange-200 text-gray-500 hover:text-orange-700 transition-all"> <RotateCcw className="w-4 h-4 mb-1" /> <span className="text-[10px] font-bold">合并导入</span> </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2 w-40 lg:w-56">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input type="text" placeholder="搜索姓名或拼音..." className="bg-transparent border-none outline-none text-sm w-full font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => setFilterModalOpen(true)} className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="高级筛选"> <Filter className="w-5 h-5" /> </button>
            <button onClick={() => setColorModalOpen(true)} className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors hidden sm:block" title="显示设置"> <Palette className="w-5 h-5" /> </button>
            <button onClick={handleExportHistory} className="p-2 md:px-3 md:py-2 flex items-center text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-sm font-bold" title="导出历史报表"> <FileDown className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">报表</span> </button>
            
            <button onClick={handleGlobalViolationSync} className="p-2 md:px-3 md:py-2 flex items-center text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors text-sm font-bold" title="更新违章"> <ShieldAlert className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">违章</span> </button>
            <button onClick={handleGlobalSync} className="p-2 md:px-3 md:py-2 flex items-center text-gray-600 bg-gray-100 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors text-sm font-bold" title="API 同步"> <Receipt className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">账单</span> </button>
            
            <div className="flex items-center gap-1">
                <button onClick={() => openImportModal('violations')} className="p-2 text-orange-600 hover:bg-orange-50 bg-white border border-transparent hover:border-orange-200 rounded-lg transition-colors" title="导入违章"> <FileWarning className="w-5 h-5" /> </button>
                <button onClick={() => openImportModal('full')} className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="导入完整数据"> <Upload className="w-5 h-5" /> </button>
            </div>
            <button onClick={handleAdd} className="flex items-center px-3 py-2 md:px-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition shadow-lg text-sm font-bold"> <Plus className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">添加</span> </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2 flex-wrap">
             <button onClick={() => setRiskFilter(null)} className={`px-3 py-1 rounded-full text-sm font-black transition-all ${!riskFilter ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}> 全部 {sortedRecords.length} </button>
             <div className="flex gap-2">
                  {severeCount > 0 && <button onClick={() => toggleRiskFilter('severe')} className={`px-3 py-1 text-xs font-black rounded-full border transition-all ${riskFilter === 'severe' ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-50 text-purple-700 border-purple-200'}`}> {severeCount} 严重风险 </button>}
                  {highCount > 0 && <button onClick={() => toggleRiskFilter('high')} className={`px-3 py-1 text-xs font-black rounded-full border transition-all ${riskFilter === 'high' ? 'bg-red-600 text-white shadow-md' : 'bg-red-50 text-red-600 border-red-200'}`}> {highCount} 高风险 </button>}
                  {dueCount > 0 && <button onClick={() => toggleRiskFilter('due')} className={`px-3 py-1 text-xs font-black rounded-full border transition-all ${riskFilter === 'due' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-700 border-blue-200'}`}> {dueCount} 缴费窗口 </button>}
             </div>
             
             {/* 新增：隐藏催缴状态切换开关 */}
             <div className="h-4 w-px bg-gray-200 mx-2 hidden sm:block"></div>
             <button 
                onClick={() => setHideRemindStatus(!hideRemindStatus)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border transition-all ${hideRemindStatus ? 'bg-brand-600 text-white border-brand-700 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
             >
                {hideRemindStatus ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                {hideRemindStatus ? '已隐藏催缴' : '隐藏催缴状态'}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedRecords.map(record => (
            <DriverCard key={record.id} record={record} colors={colorSettings} hideRemindStatus={hideRemindStatus} onView={setViewingRecord} onEdit={handleEdit} onDelete={handleDeleteRequest} onSync={handleSingleSync} onViolationSync={handleSingleViolationSync} onRemind={handleRemind} />
          ))}
        </div>
      </main>
      
      {/* Minimized Modals Container */}
      <div className="fixed bottom-24 right-8 z-[80] flex flex-col gap-2">
        {syncState.isOpen && syncState.isMinimized && (
           <button 
             onClick={() => setSyncState({ ...syncState, isMinimized: false })}
             className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-2 animate-bounce-subtle"
           >
              <RefreshCw className="w-5 h-5 animate-spin" /> 
              <span className="text-xs font-black">账单同步中</span>
              <Maximize2 className="w-3 h-3 ml-1" />
           </button>
        )}
        {violationSyncState.isOpen && violationSyncState.isMinimized && (
           <button 
             onClick={() => setViolationSyncState({ ...violationSyncState, isMinimized: false })}
             className="bg-rose-700 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-2 animate-bounce-subtle"
           >
              <ShieldAlert className="w-5 h-5 animate-pulse" /> 
              <span className="text-xs font-black">
                违章更新中 {violationProgress.current}/{violationProgress.total}
              </span>
              <Maximize2 className="w-3 h-3 ml-1" />
           </button>
        )}
      </div>

      <button onClick={() => setMemoOpen(true)} className="fixed bottom-8 right-8 w-14 h-14 bg-yellow-400 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[50] animate-bounce-subtle">
        <StickyNote className="w-7 h-7" />
        {memos.filter(m => !m.isCompleted).length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{memos.filter(m => !m.isCompleted).length}</span>}
      </button>

      <ImportModal isOpen={isImportOpen} mode={importMode} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <EditModal isOpen={isEditOpen} initialData={editingRecord} onClose={() => setEditOpen(false)} onSave={handleSave} />
      
      <ApiConfigModal 
        isOpen={syncState.isOpen} 
        isMinimized={syncState.isMinimized}
        records={syncTargetRecords} 
        onClose={() => setSyncState({ ...syncState, isOpen: false })} 
        onMinimize={() => setSyncState({ ...syncState, isMinimized: true })}
        onSyncComplete={handleApiSyncComplete} 
      />
      
      <ViolationSyncModal
        isOpen={violationSyncState.isOpen}
        isMinimized={violationSyncState.isMinimized}
        records={violationSyncTargetRecords}
        onClose={() => setViolationSyncState({ ...violationSyncState, isOpen: false })}
        onMinimize={() => setViolationSyncState({ ...violationSyncState, isMinimized: true })}
        onSyncComplete={handleViolationSyncComplete}
        onProgress={(c, t) => setViolationProgress({ current: c, total: t })}
      />

      <DeleteModal isOpen={deleteData.isOpen} driverName={deleteData.name} onClose={() => setDeleteData({ ...deleteData, isOpen: false })} onConfirm={confirmDelete} />
      <ColorSettingsModal isOpen={isColorModalOpen} currentSettings={colorSettings} onClose={() => setColorModalOpen(false)} onSave={setColorSettings} />
      <FilterModal isOpen={isFilterModalOpen} currentConfig={filterConfig} onClose={() => setFilterModalOpen(false)} onApply={setFilterConfig} />
      <DetailsModal record={viewingRecord} colors={colorSettings} onClose={() => setViewingRecord(null)} onEdit={handleEdit} />
      <MemoModal isOpen={isMemoOpen} memos={memos} categories={memoCategories} onClose={() => setMemoOpen(false)} onUpdate={setMemos} onCategoriesUpdate={setMemoCategories} />
    </div>
  );
};

export default App;
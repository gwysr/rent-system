
import { DriverRecord, RiskStatus, HighlightRule, RiskLevel } from '../types';
import { pinyin, match } from 'pinyin-pro';

export const getLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 格式化日期：YYYY/MM/DD
export const formatDate = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
};

/**
 * 语义化时间格式化 (今天/昨天/日期)
 */
export const formatFriendlyDate = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (targetDate.getTime() === today.getTime()) {
    return `今天 ${timeStr}`;
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return `昨天 ${timeStr}`;
  } else {
    const yearStr = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()}/`;
    return `${yearStr}${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${timeStr}`;
  }
};

// --- 增强版模糊搜索算法 ---
export const matchFuzzy = (searchTerm: string, record: DriverRecord): boolean => {
  if (!searchTerm) return true;
  const target = searchTerm.toLowerCase().trim();
  
  // 1. 基础匹配：姓名或车牌直接包含搜索词
  if (record.name.toLowerCase().includes(target)) return true;
  if (record.licensePlate.toLowerCase().includes(target)) return true;

  // 2. 智能拼音/字母匹配 (使用 pinyin-pro 的 match 引擎)
  if (match(record.name, target, { precision: 'start' })) return true;
  if (match(record.licensePlate, target, { precision: 'start' })) return true;

  return false;
};

// --- API 元数据获取 ---
export const fetchInformMetadata = async (licensePlate: string, mode: string) => {
  const url = `https://frp-dad.com:34746/inform.php?carid=${encodeURIComponent(licensePlate)}&mode=${mode}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    return json.errno === 0 ? json.data : null;
  } catch (err) {
    console.error('Fetch inform metadata failed:', err);
    return null;
  }
};

// --- 正式：违约告知书模板 ---
export const generateOfficialInformLetter = (record: DriverRecord, status: RiskStatus, apiData: any): string => {
  const now = new Date();
  const wrapDate = (d: Date) => ({
    y: `[ ${d.getFullYear()} ]`,
    m: `[ ${d.getMonth() + 1} ]`,
    d: `[ ${d.getDate()} ]`
  });
  const todayParts = wrapDate(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const deadlineParts = wrapDate(tomorrow);

  let signDateParts = { y: '[ / ]', m: '[ / ]', d: '[ / ]' };
  const rawSignDate = apiData?.orderTime || record.contractStartDate;
  if (rawSignDate) {
    const sd = new Date(rawSignDate);
    if (!isNaN(sd.getTime())) signDateParts = wrapDate(sd);
  }

  const userName = `[ ${apiData?.userName || record.name} ]`;
  const carModel = `[ ${apiData?.carModelName || '[ ]'} ]`;
  const carColor = `[ ${apiData?.carColor || '[ ]'} ]`;
  const carNo = `[ ${apiData?.carNo || record.licensePlate} ]`;
  const vCount = `[ ${record.violationCount} ]`;
  const vFine = `[ ${record.violationFine} ]`;
  const vPoints = `[ ${record.violationPoints} ]`;
  const unpaidRent = `[ ${status.unpaidRent > 0 ? status.unpaidRent.toFixed(0) : ' '} ]`;

  return `违约告知书
${userName}先生/女士：
您于${signDateParts.y}年${signDateParts.m}月${signDateParts.d}日与我公司签署编号为[ / ]的《汽车租赁合同》（下称“合同”），承租车型为${carModel}颜色为${carColor}车牌号为${carNo} 车辆识别代码为[ / ]发动机号为[ / ]的车辆。基于合同约定，截至${todayParts.y}年${todayParts.m}月${todayParts.d}日，您累计产生违章${vCount}条、交通违章罚款${vFine}元、交通违章记分${vPoints}分、拖欠租金${unpaidRent}元，其他违约情形[ / ]导致我公司共计损失[ / ]元。

您的上述行为已严重违反合同约定，现我公司郑重告知您，请您于${deadlineParts.y}年${deadlineParts.m}月${deadlineParts.d}日[ 17 ]时前处理完上述所有交通违章情形，清除交通违章记分，并向我公司交足租金欠款。届时，如仍未处理完毕，我司将根据合同约定收回租赁车辆（车上物品将一并处理）。
特此函告！

[ 广州快快新能源汽车科技有限公司 ]
${todayParts.y}年${todayParts.m}月${todayParts.d}日`;
};

// --- 文案模板 ---
export const generateCollectionLetter = (record: DriverRecord, status: RiskStatus): string => {
  const today = formatDate(new Date());
  const violationTotal = record.violationFine + (record.violationPoints * 200);
  return `【催缴通知】
承租人：${record.name}
车牌号：${record.licensePlate}
统计日期：${today}
当前计费周期：第${status.currentPeriod}周 (${status.periodRange})

账务详情：
1. 租金欠款：¥${status.unpaidRent.toFixed(2)}
2. 违章费用：¥${violationTotal.toFixed(2)}
当前总欠费合计：¥${status.totalDebt.toFixed(2)}`;
};

/**
 * 生成柔性催缴文案
 * 外科手术级改动：
 * 1. 逻辑修复：修正明日催缴的应缴金额计算，正确减去已支付部分
 * 2. 继承计算逻辑：明日催缴金额 = max(0, (今日应缴基数 + 单周租金) - 累计实付) + 往期逾期
 */
export const generatePoliteReminder = (record: DriverRecord, status: RiskStatus): string => {
  const isTomorrow = status.isPreDueDay;
  const timeText = status.isDueDay ? "今天" : "明天";
  
  // 获取单周租金 (1/4 逻辑)
  const weeklyRent = record.totalPayable / 4;
  
  // 逻辑纠偏：明日催缴显示包含明天即将产生的那一笔，并扣除已支付金额
  // status.expectedPaid 代表今日之前（含今日）应该达到的累计实付水平
  const displayRentAmount = isTomorrow 
    ? Math.max(0, (status.expectedPaid + weeklyRent) - record.actualPaid) + (record.overdueRentAmount || 0)
    : status.unpaidRent;

  return `【快快租赁温馨提醒】尊敬的${record.name}师傅，您的车辆（${record.licensePlate}）${timeText}即是租金缴纳日。为了确保您的车辆能正常启动、避免因系统逾期自动限制导致无法用车，请及时核对并缴纳当前租金共计：${displayRentAmount.toFixed(2)}元。感谢您的配合，祝您出车顺利，一路平安！`;
};

export const getComputedBillDate = (contractStartDateStr: string): Date => {
  if (!contractStartDateStr) return new Date();
  const today = new Date();
  const contract = new Date(contractStartDateStr);
  today.setHours(0,0,0,0);
  contract.setHours(0,0,0,0);
  const dayOfContract = contract.getDate();
  const dayOfToday = today.getDate();
  let targetYear = today.getFullYear();
  let targetMonth = today.getMonth();
  if (dayOfToday < dayOfContract) targetMonth -= 1;
  return new Date(targetYear, targetMonth, dayOfContract);
};

export const calculateBillingStatus = (
  record: DriverRecord, 
  highlightRule: HighlightRule = 'smart_tiered',
  checkDate: Date = new Date()
): RiskStatus => {
  const startDate = getComputedBillDate(record.contractStartDate);
  const current = new Date(checkDate);
  current.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(endDate.getDate() - 1);

  const formatDateSlash = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  const periodRange = `${formatDateSlash(startDate)}-${formatDateSlash(endDate)}`;

  const totalDaysInCycle = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const dayDiff = Math.ceil((current.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  
  // 已过天数
  const passedDays = dayDiff + 1;
  
  const weeklyRent = record.totalPayable / 4;
  const violationCost = (record.violationPoints * 200) + record.violationFine;
  
  const dueDays = [6, 13, 20, totalDaysInCycle - 1]; 
  const isDueDay = dueDays.includes(dayDiff);
  const isPreDueDay = dueDays.map(d => d - 1).includes(dayDiff);

  const checkDateStr = getLocalDateString(current);
  const isReminded = record.lastRemindedDate === checkDateStr;

  // 拖欠租金 (阶梯逻辑)
  const theoreticalRentStep = (dueDays.filter(d => dayDiff >= d).length) * weeklyRent;
  const unpaidRent = Math.max(0, theoreticalRentStep - record.actualPaid) + (record.overdueRentAmount || 0);

  // 当前结算总欠款
  const rentAccruedToday = (record.totalPayable / totalDaysInCycle) * passedDays;
  
  let currentSettlementDebt: number;
  if (record.actualPaid >= rentAccruedToday) {
    currentSettlementDebt = violationCost;
  } else {
    currentSettlementDebt = (rentAccruedToday - record.actualPaid) + violationCost;
  }

  const totalDebt = currentSettlementDebt + (record.overdueRentAmount || 0);

  let riskLevel: RiskLevel = 'normal';
  if (totalDebt >= 1300) riskLevel = 'severe';
  else if (unpaidRent >= weeklyRent) riskLevel = 'high';

  return {
    isArrears: totalDebt > 0,
    arrearsAmount: totalDebt,
    realTimeArrears: totalDebt, 
    unpaidRent,
    isPreDueDay,
    periodRange,
    expectedPaid: theoreticalRentStep,
    violationCost,
    totalDebt,
    riskLevel,
    isHighRisk: ['severe', 'high'].includes(riskLevel),
    isDueDay,
    isReminded,
    riskReasons: [],
    currentPeriod: Math.min(4, Math.floor(dayDiff / 7) + 1),
    computedBillDate: startDate.toISOString().split('T')[0],
    currentCycleArrears: unpaidRent
  };
};

export const formatReason = (reason: string, changeAmount: number = 0): string => {
  const map: Record<string, string> = {
    PURCHASE: '新购入库',
    CONSUME: '品饮/使用',
    CONSUMPTION: '品饮/使用',
    GIFT: changeAmount > 0 ? '获赠' : '赠友',
    DAMAGE: '损耗/遗失',
    LOSS: '损耗/遗失',
    ADJUST: '盘盈调整',
    ADJUSTMENT: changeAmount > 0 ? '盘盈调整' : '盘亏调整',
    INITIAL: '初始入库'
  };
  return map[reason] || reason;
};

export const formatCurrency = (amount: number = 0): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatUnitPrice = (price: number, unit: string): string => {
  if (!price || isNaN(price)) return '';
  const cleanUnit = unit ? unit.split(' ')[0] : '件';
  return `≈ ${new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 1
  }).format(price)} / ${cleanUnit}`;
};

export const formatDate = (timestamp: number | string | undefined): string => {
  if (!timestamp) return '--';
  const num = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(num)) return '--';
  return new Date(num).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatDateTime = (timestamp: number | string | undefined): string => {
  if (!timestamp) return '--';
  const num = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(num)) return '--';
  return new Date(num).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isDbSchemaError = (msg?: string): boolean => {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('relation') ||
    m.includes('does not exist') ||
    m.includes('column') ||
    m.includes('undefined table') ||
    m.includes('table_missing')
  );
};

export const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 11) return '早安';
  if (h < 13) return '午安';
  if (h < 18) return '午后好';
  return '晚上好';
};

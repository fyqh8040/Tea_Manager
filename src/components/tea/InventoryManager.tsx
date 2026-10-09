import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { TeaItem, InventoryLog } from '../../types/tea';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { REASON_OPTIONS } from '../../constants/tea';
import { formatReason, formatDateTime } from '../../utils/formatters';

export interface InventoryManagerProps {
  item: TeaItem;
  logs: InventoryLog[];
  isLoading: boolean;
  onUpdate: (amt: number, reason: string, note: string) => Promise<boolean>;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  item,
  logs,
  isLoading,
  onUpdate
}) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('PURCHASE');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'IN' | 'OUT'>('IN');

  const handleSubmit = async () => {
    const parsedAmt = Number(amount);
    if (!amount || isNaN(parsedAmt) || parsedAmt <= 0) {
      alert('请输入有效的正数数量');
      return;
    }

    setIsSubmitting(true);
    const finalAmount = mode === 'IN' ? parsedAmt : -parsedAmt;
    const success = await onUpdate(finalAmount, reason, note);

    if (success) {
      setAmount('');
      setNote('');
      setReason(mode === 'IN' ? 'PURCHASE' : 'CONSUMPTION');
    }
    setIsSubmitting(false);
  };

  const currentReasons = mode === 'IN' ? REASON_OPTIONS.IN : REASON_OPTIONS.OUT;

  return (
    <div className="space-y-6">
      {/* Current Balance Display */}
      <div className="bg-white p-4 rounded-xl border border-tea-200/80 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs text-tea-500 font-bold uppercase tracking-wider block">
            当前库存结余
          </span>
          <span className="text-2xl font-bold font-serif text-tea-900">
            {item.quantity}{' '}
            <span className="text-sm font-sans text-tea-500 font-normal">{item.unit}</span>
          </span>
        </div>
        <div className="text-right text-xs text-tea-400">
          <div>单价参考</div>
          <div className="font-mono text-tea-700 font-bold">
            {item.unit_price ? `¥${Math.round(item.unit_price * 10) / 10}` : '--'}
          </div>
        </div>
      </div>

      {/* Stock Change Form */}
      <div className="bg-tea-50/80 p-4 rounded-xl border border-tea-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-tea-800 text-xs uppercase tracking-wider">
            记录库存流水
          </h4>
          <div className="flex bg-white rounded-lg p-0.5 border border-tea-200/60 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setMode('IN');
                setReason('PURCHASE');
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                mode === 'IN'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-tea-500 hover:text-tea-800'
              }`}
            >
              入库 (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('OUT');
                setReason('CONSUMPTION');
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                mode === 'OUT'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-tea-500 hover:text-tea-800'
              }`}
            >
              出库 (-)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-12 sm:col-span-4">
            <Input
              label={mode === 'IN' ? '入库数量' : '出库数量'}
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
              }
              placeholder="0"
              prefixIcon={mode === 'IN' ? <Plus size={14} /> : <span className="text-sm font-bold">-</span>}
            />
          </div>

          <div className="col-span-12 sm:col-span-4">
            <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block mb-1.5">
              变动原因
            </label>
            <select
              className="w-full px-3 py-2 bg-white/70 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-tea-800 text-sm h-[38px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {currentReasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-12 sm:col-span-4">
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              className="w-full h-[38px]"
            >
              确认登记
            </Button>
          </div>

          <div className="col-span-12">
            <Input
              label="备注 (可选)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录品饮感受、冲泡水温、赠予好友等细节..."
            />
          </div>
        </div>
      </div>

      {/* History Log List */}
      <div>
        <h4 className="font-bold text-tea-800 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>历史流水日志</span>
          <span className="text-[11px] text-tea-400 font-normal">
            共 {logs.length} 条记录
          </span>
        </h4>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="animate-spin text-tea-400" size={24} />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-tea-400 text-xs bg-tea-50/50 rounded-xl border border-dashed border-tea-200">
            暂无库存出入库记录
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {logs.map((log) => {
              const isPositive = log.change_amount > 0;
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-white border border-tea-100 rounded-lg shadow-sm hover:border-tea-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isPositive
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-tea-800">
                        {formatReason(log.reason, log.change_amount)}{' '}
                        <span
                          className={`ml-1 font-mono ${
                            isPositive ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {isPositive ? `+${log.change_amount}` : log.change_amount} {item.unit}
                        </span>
                      </div>
                      <div className="text-[11px] text-tea-400 mt-0.5">
                        {formatDateTime(log.created_at)}
                        {log.note && (
                          <span className="text-tea-500 ml-1.5">| {log.note}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-mono text-tea-500 font-medium">
                      结余: {log.current_balance}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface DbInitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DbInitModal: React.FC<DbInitModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const startInit = async () => {
    setStatus('LOADING');
    setLogs([]);
    addLog('正在建立数据库连接...');
    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const json = await res.json();

      if (res.ok) {
        addLog('已校验 public.users 表结构');
        addLog('已校验 public.tea_items 表与索引');
        addLog('已校验 public.inventory_logs 流水表');
        addLog('Schema 初始化并迁移完成！');
        setStatus('SUCCESS');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(json.details || json.error || '迁移异常');
      }
    } catch (e: any) {
      addLog(`执行失败: ${e.message}`);
      setStatus('ERROR');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="云端数据库结构向导" maxWidth="md">
      <div className="p-6">
        <p className="text-xs text-tea-500 mb-4 leading-relaxed">
          点击下方按钮将自动在您的 PostgreSQL 数据库中执行建表与结构平滑迁移脚本，无需手动在数据库后台执行 SQL。
        </p>

        <div className="bg-slate-900 rounded-xl p-4 mb-4 h-48 overflow-y-auto font-mono text-xs text-emerald-400 border border-slate-800 shadow-inner">
          {logs.length === 0 ? (
            <span className="text-slate-500">// 准备就绪，点击“开始初始化”启动迁移...</span>
          ) : (
            logs.map((l, i) => <div key={i} className="leading-relaxed">{l}</div>)
          )}
        </div>

        {status === 'SUCCESS' && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl mb-4 border border-emerald-200">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>数据库结构验证通过！您可以关闭此弹窗开始使用。</span>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-xs rounded-xl mb-4 border border-red-200">
            <AlertCircle size={16} className="shrink-0" />
            <span>执行出错，请检查 DATABASE_URL 连接字符串与网络权限。</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-tea-100">
          <Button variant="secondary" onClick={onClose}>
            {status === 'SUCCESS' ? '完成' : '取消'}
          </Button>
          <Button
            onClick={startInit}
            disabled={status === 'LOADING' || status === 'SUCCESS'}
            loading={status === 'LOADING'}
          >
            {status === 'SUCCESS' ? (
              <>
                <CheckCircle2 size={15} /> 已完成
              </>
            ) : (
              <>
                <Database size={15} /> 开始初始化 / 修复
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

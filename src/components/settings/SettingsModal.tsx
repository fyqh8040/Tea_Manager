import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Shield,
  Lock,
  LogOut,
  Trash2,
  Database,
  Cloud,
  AlertTriangle,
  Loader2,
  Download,
  Upload,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { UserProfile, AppConfig } from '../../types/tea';
import { authFetch } from '../../utils/api';
import { formatDate } from '../../utils/formatters';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig | null;
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  onLogout: () => void;
  onChangePassword: () => void;
  onDbError: () => void;
  onExportData?: () => void;
  onImportSuccess?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  user,
  setUser,
  onLogout,
  onChangePassword,
  onDbError,
  onExportData,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'USERS' | 'SYSTEM'>('PROFILE');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // New User Form (Admin only)
  const [newUserUser, setNewUserUser] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserNick, setNewUserNick] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportItems, setPendingImportItems] = useState<any[] | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (isOpen && user?.role === 'admin' && activeTab === 'USERS') {
      fetchUsers();
    }
  }, [isOpen, activeTab, user]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await authFetch('/api/auth?action=list_users');
      const json = await res.json();
      if (res.ok) setUsers(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserUser.trim() || !newUserPass.trim()) {
      alert('请填写用户名和密码');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await authFetch('/api/auth?action=create_user', {
        method: 'POST',
        body: JSON.stringify({
          username: newUserUser.trim(),
          password: newUserPass.trim(),
          nickname: newUserNick.trim()
        })
      });
      if (res.ok) {
        setNewUserUser('');
        setNewUserPass('');
        setNewUserNick('');
        fetchUsers();
      } else {
        const json = await res.json();
        alert(json.error || '创建用户失败');
      }
    } catch {
      alert('创建失败，网络请求异常');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定删除该藏家用户吗？其名下的所有藏品数据与流水将同步被清空！')) return;
    try {
      const res = await authFetch('/api/auth?action=delete_user', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert('删除失败');
      }
    } catch {
      alert('网络异常');
    }
  };

  const handleUpdateNickname = async (val: string) => {
    if (!user || !val.trim()) return;
    try {
      const res = await authFetch('/api/auth?action=update_profile', {
        method: 'POST',
        body: JSON.stringify({ nickname: val.trim() })
      });
      if (res.ok) {
        const u = { ...user, nickname: val.trim() };
        setUser(u);
        localStorage.setItem('tea_user', JSON.stringify(u));
      }
    } catch (e) {
      console.error('Update nickname failed:', e);
    }
  };

  // Handle JSON Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // 兼容多种导出格式：裸数组、{ items: [...] } 包装格式或 { data: [...] }
        let itemsToImport: any[] = [];
        if (Array.isArray(parsed)) {
          itemsToImport = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.items)) {
            itemsToImport = parsed.items;
          } else if (Array.isArray(parsed.data)) {
            itemsToImport = parsed.data;
          }
        }

        // 校验藏品有效性
        const validItems = itemsToImport.filter(
          (item) => item && typeof item === 'object' && typeof item.name === 'string' && item.name.trim().length > 0
        );

        if (validItems.length === 0) {
          alert('所选备份文件未检测到有效的藏品数据列表，请确认文件格式。');
          return;
        }

        setPendingImportItems(validItems);
        setImportFileName(file.name);
      } catch (err: any) {
        alert(`解析 JSON 备份文件失败: ${err.message}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async (mode: 'append' | 'replace') => {
    if (!pendingImportItems || pendingImportItems.length === 0) return;

    if (mode === 'replace') {
      const ok = confirm('⚠️ 警告：覆盖恢复将会清空您当前已有的全部藏品与流水，确定继续吗？');
      if (!ok) return;
    }

    setIsImporting(true);
    try {
      const res = await authFetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'batch_import',
          items: pendingImportItems,
          mode
        })
      });
      const json = await res.json();
      if (res.ok) {
        alert(`🎉 成功恢复导入 ${json.importedCount || pendingImportItems.length} 款藏品！`);
        setPendingImportItems(null);
        setImportFileName('');
        if (onImportSuccess) onImportSuccess();
        onClose();
      } else {
        alert(`导入失败: ${json.error || '服务器处理异常'}`);
      }
    } catch (e: any) {
      alert(`导入异常: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="系统设置与偏好" maxWidth="lg">
      {/* Hidden File Input for JSON Backup Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex border-b border-tea-100 bg-tea-50/50">
        <button
          type="button"
          onClick={() => setActiveTab('PROFILE')}
          className={`flex-1 py-3 text-xs font-bold transition-colors ${
            activeTab === 'PROFILE'
              ? 'text-accent border-b-2 border-accent bg-white'
              : 'text-tea-500 hover:text-tea-800'
          }`}
        >
          个人中心
        </button>

        {user?.role === 'admin' && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('USERS')}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                activeTab === 'USERS'
                  ? 'text-accent border-b-2 border-accent bg-white'
                  : 'text-tea-500 hover:text-tea-800'
              }`}
            >
              用户管理
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SYSTEM')}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                activeTab === 'SYSTEM'
                  ? 'text-accent border-b-2 border-accent bg-white'
                  : 'text-tea-500 hover:text-tea-800'
              }`}
            >
              云端状态
            </button>
          </>
        )}
      </div>

      <div className="p-6">
        {/* Profile Tab */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-tea-50/80 rounded-xl border border-tea-100">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-accent shadow-sm border border-tea-200/50">
                {user.role === 'admin' ? <Shield size={28} /> : <UserIcon size={28} />}
              </div>
              <div>
                <div className="font-bold text-tea-900 text-base font-serif flex items-center gap-2">
                  <span>{user.nickname}</span>
                  {user.role === 'admin' && <Badge color="accent">管理员</Badge>}
                </div>
                <div className="text-tea-400 text-xs mt-0.5">@{user.username}</div>
              </div>
            </div>

            <Input
              label="修改称谓 / 昵称"
              value={user.nickname}
              onBlur={(e) => handleUpdateNickname(e.target.value)}
              onChange={(e) => setUser({ ...user, nickname: e.target.value })}
              placeholder="例如：煮雪居士"
            />

            {/* Import / Export & Actions */}
            <div className="space-y-2.5 pt-3 border-t border-tea-100">
              <h5 className="text-[11px] font-bold text-tea-500 uppercase tracking-wider mb-2">
                数据资产与备份
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onExportData && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start text-xs text-tea-700 hover:text-accent"
                    onClick={onExportData}
                  >
                    <Download size={14} className="text-accent" /> 导出备份 (JSON)
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="w-full justify-start text-xs text-tea-700 hover:text-accent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} className="text-accent" /> 导入恢复 (JSON)
                </Button>
              </div>

              {/* Pending Import Confirmation Dialog */}
              {pendingImportItems && (
                <div className="mt-3 p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-emerald-900 text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <FileCheck2 size={16} className="text-emerald-600" />
                      <span>已成功解析备份文件</span>
                    </div>
                    {importFileName && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-mono truncate max-w-[150px]">
                        {importFileName}
                      </span>
                    )}
                  </div>

                  <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-100 flex items-center justify-between text-xs text-tea-800">
                    <div>
                      共包含 <span className="font-bold text-accent">{pendingImportItems.length}</span> 件藏品
                    </div>
                    <div className="flex gap-2 text-[11px] text-tea-600">
                      <span>茶叶: <strong className="text-tea-800">{pendingImportItems.filter(i => i.type !== 'TEAWARE').length}</strong></span>
                      <span>•</span>
                      <span>茶器: <strong className="text-tea-800">{pendingImportItems.filter(i => i.type === 'TEAWARE').length}</strong></span>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    请选择恢复策略：
                    <br />
                    • <strong>追加导入</strong>：保留当前藏品，将文件中的藏品新增到库中。
                    <br />
                    • <strong>清空覆盖</strong>：清空当前现有藏品，完全还原为备份状态（适合数据库迁移或误删灾难恢复）。
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => executeImport('append')}
                      loading={isImporting}
                    >
                      追加导入
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => executeImport('replace')}
                      loading={isImporting}
                    >
                      清空并覆盖恢复
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPendingImportItems(null);
                        setImportFileName('');
                      }}
                      disabled={isImporting}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <Button
                  variant="secondary"
                  className="w-full justify-start text-xs"
                  onClick={onChangePassword}
                >
                  <Lock size={14} /> 修改密码
                </Button>
                <Button
                  variant="danger"
                  className="w-full justify-start text-xs"
                  onClick={onLogout}
                >
                  <LogOut size={14} /> 退出登录
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab (Admin) */}
        {activeTab === 'USERS' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateUser} className="bg-tea-50/80 p-4 rounded-xl border border-tea-100 space-y-3">
              <h4 className="font-bold text-xs text-tea-600 uppercase tracking-wider">
                新增藏家账号
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="登录用户名"
                  value={newUserUser}
                  onChange={(e) => setNewUserUser(e.target.value)}
                  required
                />
                <Input
                  placeholder="登录初始密码"
                  type="password"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="藏家称谓 / 昵称 (选填)"
                    value={newUserNick}
                    onChange={(e) => setNewUserNick(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={isCreatingUser}>
                  创建账号
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="font-bold text-xs text-tea-600 uppercase tracking-wider mb-2">
                已注册藏家列表
              </h4>
              {isLoadingUsers ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="animate-spin text-tea-400" size={24} />
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 bg-white border border-tea-100 rounded-lg shadow-sm"
                    >
                      <div>
                        <div className="font-bold text-tea-800 text-xs">
                          {u.nickname}{' '}
                          <span className="text-tea-400 font-normal">@{u.username}</span>
                          {u.role === 'admin' && (
                            <Badge color="accent" size="sm" className="ml-2">
                              管理员
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-tea-400 mt-0.5">
                          注册于 {formatDate(u.created_at)}
                        </div>
                      </div>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-tea-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="删除用户"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Tab (Admin) */}
        {activeTab === 'SYSTEM' && (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <h4 className="font-bold text-xs text-tea-600 uppercase tracking-wider">
                云端服务状态
              </h4>
              <div className="flex items-center justify-between p-3.5 bg-white border border-tea-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <Database
                    size={20}
                    className={config?.hasServerDb ? 'text-emerald-500' : 'text-red-500'}
                  />
                  <div>
                    <div className="text-xs font-bold text-tea-800">PostgreSQL 在线数据库</div>
                    <div className="text-[11px] text-tea-400">
                      {config?.hasServerDb
                        ? '已配置 DATABASE_URL / Neon 直连'
                        : '未检测到 DATABASE_URL / POSTGRES_URL 环境变量'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config?.hasServerDb ? (
                    <Badge color="green">已连接</Badge>
                  ) : (
                    <Badge color="red">未配置</Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={onDbError}>
                    结构初始化
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white border border-tea-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <Cloud
                    size={20}
                    className={config?.imageApiUrl ? 'text-emerald-500' : 'text-tea-400'}
                  />
                  <div>
                    <div className="text-xs font-bold text-tea-800">外部图床服务</div>
                    <div className="text-[11px] text-tea-400">
                      {config?.imageApiUrl
                        ? '支持 Cloudflare-ImgBed / Telegraph 图床'
                        : '未配置，系统已自动启用客户端智能压缩存储'}
                    </div>
                  </div>
                </div>
                {config?.imageApiUrl ? (
                  <Badge color="green">已配置</Badge>
                ) : (
                  <Badge color="tea">内置轻量压缩</Badge>
                )}
              </div>
            </div>

            <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
              <h4 className="font-bold mb-1 flex items-center gap-1.5 text-amber-800">
                <AlertTriangle size={15} /> 生产部署要点说明
              </h4>
              <p className="mb-1.5">
                本项目已完全优化为云端 Serverless 架构，数据持久化完全托管于云端 PostgreSQL 数据库（如 Supabase / Neon / RDS）。
              </p>
              <p className="text-[11px] text-amber-700">
                若需更新数据库连接或修改密钥，请在 Vercel 控制台的项目 <strong>Settings → Environment Variables</strong> 中配置 <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">DATABASE_URL</code> 或 <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">POSTGRES_URL</code>。
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Leaf, AlertCircle, Database, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { UserProfile } from '../../types/tea';
import { isDbSchemaError } from '../../utils/formatters';

export interface LoginScreenProps {
  onLogin: (user: UserProfile, token: string) => void;
  onOpenDbInit: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onOpenDbInit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || '登录失败，请检查账号密码');
      }
    } catch {
      setError('无法连接到服务端，请确认网络连接与服务端状态');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f5] p-4 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#a67b5b]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white/85 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl p-8 w-full max-w-md relative z-10 transition-all">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-accent/25 transition-transform hover:scale-105 duration-300">
            <Leaf size={32} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-tea-900 tracking-tight">茶韵典藏</h1>
          <p className="text-tea-500 mt-2 text-xs tracking-wider">在线私人茶叶与茶器资产管理</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="用户名"
            placeholder="请输入管理员或普通账号"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            prefixIcon={<UserIcon size={16} />}
            required
            autoComplete="username"
          />

          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            prefixIcon={<Lock size={16} />}
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
              {isDbSchemaError(error) && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={onOpenDbInit}
                  className="mt-1"
                >
                  <Database size={14} /> 打开数据库初始化向导
                </Button>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full !py-2.5 shadow-lg shadow-accent/25 mt-5 font-serif text-base"
            loading={loading}
          >
            进入茶室
          </Button>
        </form>

        <div className="mt-8 pt-4 border-t border-tea-100 text-center text-[11px] text-tea-400">
          初次部署使用默认管理员：<span className="font-mono text-tea-600">admin / admin</span>
        </div>
      </div>
    </div>
  );
};

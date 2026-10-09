import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { authFetch } from '../../utils/api';

export interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  forced?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  forced = false
}) => {
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPass) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 4) {
      setError('新密码长度不能少于 4 位');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/auth?action=change_password', {
        method: 'POST',
        body: JSON.stringify({ newPassword: password })
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || '修改密码失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={forced ? () => {} : onClose}
      maxWidth="sm"
      showCloseButton={!forced}
    >
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={22} />
          </div>
          <h3 className="text-lg font-bold text-tea-900 font-serif">
            {forced ? '请修改初始密码' : '修改登录密码'}
          </h3>
          {forced && (
            <p className="text-xs text-amber-600 mt-1">
              为了保障云端数据库资产安全，首次登录必须修改默认密码
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="新密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="输入新密码 (至少4位)"
          />
          <Input
            label="确认新密码"
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="请再次输入新密码"
          />

          {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

          <div className="flex gap-2 pt-3">
            {!forced && (
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
                取消
              </Button>
            )}
            <Button className="flex-1" type="submit" loading={loading}>
              确认修改
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

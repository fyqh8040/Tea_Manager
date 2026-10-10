import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  ExternalLink,
  ShieldCheck,
  Bot,
  Cpu,
  Key,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { AiConfig, AiProviderType } from '../../types/tea';
import { getAiConfig, saveAiConfig, DEFAULT_AI_CONFIG } from '../../services/aiService';
import { Button } from '../ui/Button';

export interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: AiConfig) => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [config, setConfig] = useState<AiConfig>(() => getAiConfig());
  const [showTutorial, setShowTutorial] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setConfig(getAiConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveAiConfig(config);
    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved(config);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setConfig(DEFAULT_AI_CONFIG);
    saveAiConfig(DEFAULT_AI_CONFIG);
    if (onConfigSaved) onConfigSaved(DEFAULT_AI_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-tea-50/95 border border-tea-200/90 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-tea-200/70 bg-gradient-to-r from-tea-100/80 via-tea-50 to-tea-100/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-tea-800 text-amber-100 flex items-center justify-center shadow-xs">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-tea-900">
                AI 侍茶引擎与模型配置
              </h3>
              <p className="text-[11px] text-tea-500 font-serif">
                支持内置专家知识库、Google Gemini 与 DeepSeek/OpenAI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full text-tea-400 hover:text-tea-700 hover:bg-tea-200/50 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-serif text-sm">
          {/* Provider Selection Cards */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-tea-800 block">
              请选择侍茶顾问的核心动力引擎：
            </label>

            {/* 1. Built-in Expert Engine */}
            <label
              onClick={() => setConfig({ ...config, provider: 'builtin' })}
              className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                config.provider === 'builtin'
                  ? 'bg-emerald-50/80 border-emerald-500/80 shadow-xs ring-1 ring-emerald-400/50'
                  : 'bg-white/70 border-tea-200 hover:border-tea-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="ai_provider"
                    checked={config.provider === 'builtin'}
                    onChange={() => setConfig({ ...config, provider: 'builtin' })}
                    className="accent-emerald-700"
                  />
                  <span className="font-bold text-tea-900 text-sm">
                    🍵 内置私房茶学大师
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-sans font-medium">
                    免Key · 推荐开箱即用
                  </span>
                </div>
              </div>
              <p className="text-xs text-tea-600 mt-1.5 pl-5 leading-relaxed font-sans">
                内置完备的中国六大茶类、紫砂泥料适茶性与水温冲泡指南。深度关联您的真实库存，<strong>完全无需任何外部 API Key</strong>，零门槛、零成本、绝无异常报错。
              </p>
            </label>

            {/* 2. Google Gemini 2.5 Flash */}
            <label
              onClick={() => setConfig({ ...config, provider: 'gemini' })}
              className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                config.provider === 'gemini'
                  ? 'bg-amber-50/80 border-amber-500/80 shadow-xs ring-1 ring-amber-400/50'
                  : 'bg-white/70 border-tea-200 hover:border-tea-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="ai_provider"
                    checked={config.provider === 'gemini'}
                    onChange={() => setConfig({ ...config, provider: 'gemini' })}
                    className="accent-amber-700"
                  />
                  <span className="font-bold text-tea-900 text-sm">
                    ⚡ Google Gemini 官方大模型
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-sans font-medium">
                    {config.geminiModel && config.geminiModel !== 'gemini-2.5-flash' ? config.geminiModel : 'gemini-3.8-flash'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-tea-600 mt-1.5 pl-5 leading-relaxed font-sans">
                具备强大的开放语义理解与多模态茶器图片识别能力。Google AI Studio 提供<strong>永久免费 Key</strong>。
              </p>
            </label>

            {/* 3. DeepSeek / OpenAI Compatible */}
            <label
              onClick={() => setConfig({ ...config, provider: 'openai_compatible' })}
              className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                config.provider === 'openai_compatible'
                  ? 'bg-sky-50/80 border-sky-500/80 shadow-xs ring-1 ring-sky-400/50'
                  : 'bg-white/70 border-tea-200 hover:border-tea-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="ai_provider"
                    checked={config.provider === 'openai_compatible'}
                    onChange={() => setConfig({ ...config, provider: 'openai_compatible' })}
                    className="accent-sky-700"
                  />
                  <span className="font-bold text-tea-900 text-sm">
                    🚀 DeepSeek / OpenAI 兼容接口
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-100 text-sky-800 font-sans font-medium">
                    支持国内大模型
                  </span>
                </div>
              </div>
              <p className="text-xs text-tea-600 mt-1.5 pl-5 leading-relaxed font-sans">
                支持 DeepSeek-V3、通义千问、硅基流动、Kimi 等国内外任意兼容 OpenAI 协议的 API 端点。
              </p>
            </label>
          </div>

          {/* Conditional Configuration Panels */}
          {config.provider === 'gemini' && (
            <div className="p-3.5 bg-white rounded-xl border border-tea-200/80 space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-tea-800 flex items-center gap-1.5">
                  <Key size={13} className="text-amber-600" />
                  Gemini API 密钥 (API Key)
                </label>
                <button
                  type="button"
                  onClick={() => setShowTutorial(!showTutorial)}
                  className="text-[11px] text-amber-700 hover:underline flex items-center gap-1"
                >
                  <HelpCircle size={12} />
                  如何 1 分钟免费获取 Key？
                </button>
              </div>

              {/* Free Key Tutorial Banner */}
              {showTutorial && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-stone-700 space-y-1.5 animate-in fade-in">
                  <p className="font-bold text-amber-900">
                    💡 Google AI Studio 免费获取指引（零费用·无需信用卡）：
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-600 pl-1 text-[11px]">
                    <li>用任意 Google 账号登录 Google AI Studio 控制台；</li>
                    <li>点击左侧导航栏的「Get API key」；</li>
                    <li>点击「Create API key」按钮，复制生成的以 AIzaSy 或 AQ 开头的密钥；</li>
                    <li>粘贴到下方输入框并点击保存即可立即生效。</li>
                  </ol>
                  <div className="pt-1">
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-800 font-bold hover:underline"
                    >
                      前往 aistudio.google.com/apikey <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              )}

              <input
                type="password"
                placeholder="粘贴您的 Google Gemini API Key"
                value={config.geminiApiKey || ''}
                onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value.trim() })}
                className="w-full px-3 py-2 text-xs bg-tea-50/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />

              <div className="flex items-center justify-between text-[11px] text-tea-600">
                <span>模型版本:</span>
                <select
                  value={
                    config.geminiModel && config.geminiModel !== 'gemini-2.5-flash'
                      ? config.geminiModel
                      : 'gemini-3.8-flash'
                  }
                  onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                  className="bg-tea-50 border border-tea-200 rounded px-2 py-0.5 text-xs text-tea-800 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (最新推荐)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (极速响应)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest (实时最新)</option>
                </select>
              </div>
            </div>
          )}

          {config.provider === 'openai_compatible' && (
            <div className="p-3.5 bg-white rounded-xl border border-tea-200/80 space-y-3 font-sans">
              <div>
                <label className="text-xs font-bold text-tea-800 block mb-1">
                  API 端点地址 (Base URL)
                </label>
                <input
                  type="text"
                  placeholder="https://api.deepseek.com/v1"
                  value={config.customBaseUrl || ''}
                  onChange={(e) => setConfig({ ...config, customBaseUrl: e.target.value.trim() })}
                  className="w-full px-3 py-2 text-xs bg-tea-50/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-tea-800 block mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={config.customApiKey || ''}
                  onChange={(e) => setConfig({ ...config, customApiKey: e.target.value.trim() })}
                  className="w-full px-3 py-2 text-xs bg-tea-50/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-tea-800 block mb-1">
                  模型名称 (Model)
                </label>
                <input
                  type="text"
                  placeholder="deepseek-chat"
                  value={config.customModel || ''}
                  onChange={(e) => setConfig({ ...config, customModel: e.target.value.trim() })}
                  className="w-full px-3 py-2 text-xs bg-tea-50/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>
          )}

          {config.provider === 'builtin' && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 font-sans">
              <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">安心之选：</span>
                您无需注册任何第三方账号或配置任何密钥，系统已为您备妥数十万字中国茶学审评经验与名器资料库。可随时自由切换。
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-tea-200/70 bg-tea-100/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-tea-500 hover:text-tea-800 flex items-center gap-1 font-serif transition-colors"
          >
            <RotateCcw size={12} /> 恢复默认内置
          </button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={handleSave}>
              {savedSuccess ? (
                <>
                  <Check size={13} className="mr-1 text-emerald-300" /> 已保存生效
                </>
              ) : (
                '保存设置'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

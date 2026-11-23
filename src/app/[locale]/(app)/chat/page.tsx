'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AppNavbar } from '@/components/layout/AppNavbar';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Camera,
  CheckCircle2,
  ArrowRight,
  Loader2,
  FileText,
  User,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'WISE';
  text: string;
  intentData?: any;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'WISE',
      text: 'Halo! Saya Wise, asisten keuangan pribadimu. Kamu bisa bertanya soal kondisi anggaran, minta saran pengeluaran, atau cukup katakan apa yang baru kamu beli — saya akan bantu mencatatkannya ke pembukuan!',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [executingIntent, setExecutingIntent] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    async function loadWallets() {
      const res = await fetch('/api/ledger/balance');
      if (res.ok) {
        const json = await res.json();
        setWallets(json.data?.wallets || []);
      }
    }
    loadWallets();
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `w-${Date.now()}`,
            sender: 'WISE',
            text: json.data.reply,
            intentData: json.data.intentData,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Web Speech API Voice Recognition
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Fitur pengenalan suara tidak didukung di browser ini. Gunakan Chrome atau browser modern.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
      handleSend(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  // Receipt Scan Simulator
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const r = json.data;
        const msgText = `Saya berhasil membaca struk dari **${r.merchant}** sebesar **Rp ${r.totalAmount.toLocaleString('id-ID')}** dengan item: ${r.items.map((i: any) => i.name).join(', ')}. Disarankan dicatat ke pos **${r.suggestedPos}**.`;

        setMessages((prev) => [
          ...prev,
          {
            id: `w-${Date.now()}`,
            sender: 'WISE',
            text: msgText,
            intentData: {
              action: 'EXPENSE',
              amount: r.totalAmount,
              title: `Belanja ${r.merchant}`,
              suggestedPos: r.suggestedPos,
            },
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Intent into real transaction directly from chat
  const handleExecuteIntent = async (msgId: string, intent: any) => {
    setExecutingIntent(msgId);
    try {
      const defaultWallet = wallets[0]?.id;
      if (!defaultWallet) throw new Error('Tidak ada dompet');

      let action = intent.action;
      let bodyData: any = {};

      if (action === 'EXPENSE') {
        bodyData = {
          walletId: defaultWallet,
          amount: intent.amount,
          title: intent.title,
          posSources: [{ pos: intent.suggestedPos || 'LIVING', amount: intent.amount }],
        };
      } else if (action === 'INCOME') {
        bodyData = {
          walletId: defaultWallet,
          amount: intent.amount,
          title: intent.title,
          incomeType: intent.incomeType || 'ROUTINE',
        };
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: bodyData }),
      });

      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  intentData: null,
                  text: `${m.text}\n\n✅ *Transaksi berhasil dicatat ke Ledger!*`,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExecutingIntent(null);
    }
  };

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-page">
      <AppNavbar />

      <main className="tw-flex-1 tw-py-6 tw-px-4 sm:tw-px-6 lg:tw-px-8 tw-max-w-4xl tw-mx-auto tw-w-full tw-flex tw-flex-col">
        {/* Chat Header */}
        <div className="tw-flex tw-items-center tw-justify-between tw-pb-4 tw-border-b tw-border-border tw-mb-4">
          <div className="tw-flex tw-items-center tw-gap-3">
            <div className="tw-w-10 tw-h-10 tw-rounded-xl tw-bg-brand-primary tw-text-white tw-flex tw-items-center tw-justify-center tw-shadow-sm">
              <Sparkles className="tw-w-5 tw-h-5" />
            </div>
            <div>
              <h1 className="tw-text-base tw-font-bold tw-text-heading">Asisten Cerdas Wise</h1>
              <p className="tw-text-[11px] tw-text-muted">Online • Terhubung ke Buku Besar Finansialmu</p>
            </div>
          </div>
          <span className="badge bg-success-subtle text-success tw-text-xs tw-px-2.5 tw-py-1 tw-rounded-full">
            AI Active
          </span>
        </div>

        {/* Quick Suggestions */}
        <div className="tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-3 tw-scrollbar-none">
          {[
            'Berapa sisa uang jajan bulan ini?',
            'Cek kesehatan keuanganku',
            'Tadi beli makan siang 35rb pake GoPay',
            'Dapat transferan freelance 1.5jt di BCA',
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="tw-whitespace-nowrap tw-text-xs tw-px-3 tw-py-1.5 tw-rounded-full tw-bg-surface tw-border tw-border-border tw-text-muted hover:tw-text-heading hover:tw-border-brand-primary tw-transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat History Box */}
        <div className="tw-flex-1 tw-overflow-y-auto tw-space-y-4 tw-p-4 tw-rounded-2xl tw-border tw-border-border tw-bg-surface tw-mb-4 tw-min-h-[420px] tw-max-h-[60vh]">
          {messages.map((m) => {
            const isUser = m.sender === 'USER';
            return (
              <div
                key={m.id}
                className={`tw-flex tw-gap-3 ${isUser ? 'tw-justify-end' : 'tw-justify-start'}`}
              >
                {!isUser && (
                  <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-brand-primary tw-text-white tw-flex tw-items-center tw-justify-center tw-shrink-0 tw-shadow-sm">
                    <Sparkles className="tw-w-4 tw-h-4" />
                  </div>
                )}
                <div
                  className={`tw-max-w-[80%] tw-rounded-2xl tw-p-4 tw-text-xs tw-leading-relaxed ${
                    isUser
                      ? 'tw-bg-brand-primary tw-text-white tw-rounded-tr-none'
                      : 'tw-bg-page tw-border tw-border-border tw-text-default tw-rounded-tl-none'
                  }`}
                >
                  <p className="tw-whitespace-pre-line">{m.text}</p>

                  {/* Intent Action Card */}
                  {m.intentData && (
                    <div className="tw-mt-3 tw-p-3 tw-rounded-xl tw-bg-surface tw-border tw-border-border tw-text-default tw-space-y-2">
                      <div className="tw-flex tw-items-center tw-justify-between">
                        <span className="tw-font-bold tw-text-heading">{m.intentData.title}</span>
                        <span className="tw-font-mono tw-font-bold tw-text-brand-primary">
                          Rp {m.intentData.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="tw-flex tw-items-center tw-justify-between tw-text-[11px] tw-text-muted">
                        <span>Aksi: {m.intentData.action}</span>
                        <span>Pos: {m.intentData.suggestedPos || 'ROUTINE'}</span>
                      </div>
                      <button
                        type="button"
                        disabled={executingIntent === m.id}
                        onClick={() => handleExecuteIntent(m.id, m.intentData)}
                        className="btn btn-primary btn-sm tw-w-full tw-rounded-lg tw-font-semibold tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-mt-1"
                      >
                        {executingIntent === m.id ? (
                          <Loader2 className="tw-w-3.5 tw-h-3.5 tw-animate-spin" />
                        ) : (
                          <CheckCircle2 className="tw-w-3.5 tw-h-3.5" />
                        )}
                        <span>Catat Sekarang ke Pembukuan</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="tw-flex tw-gap-3 tw-items-center tw-text-muted tw-text-xs">
              <div className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-brand-primary/10 tw-text-brand-primary tw-flex tw-items-center tw-justify-center">
                <Loader2 className="tw-w-4 tw-h-4 tw-animate-spin" />
              </div>
              <span>Wise sedang berpikir...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Voice & Receipt Scan */}
        <div className="tw-flex tw-items-center tw-gap-2">
          {/* Receipt Upload button */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleReceiptUpload}
            className="tw-hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-outline-secondary tw-p-2.5 tw-rounded-xl"
            title="Scan Struk Belanja"
          >
            <Camera className="tw-w-5 tw-h-5" />
          </button>

          {/* Voice recording button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`btn tw-p-2.5 tw-rounded-xl ${
              isRecording ? 'btn-danger tw-animate-pulse' : 'btn-outline-secondary'
            }`}
            title="Bicara lewat suara"
          >
            {isRecording ? <MicOff className="tw-w-5 tw-h-5" /> : <Mic className="tw-w-5 tw-h-5" />}
          </button>

          {/* Text Input */}
          <div className="tw-flex-1 tw-relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? 'Mendengarkan suaramu...' : 'Tanya Wise atau ketik transaksi ("beli sate 25rb")...'}
              className="form-control tw-py-2.5 tw-rounded-xl tw-text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="btn btn-primary tw-p-2.5 tw-rounded-xl"
          >
            <Send className="tw-w-5 tw-h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}


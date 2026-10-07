import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Paperclip,
  Send,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  Terminal,
  Trash2,
  FileText,
} from 'lucide-react';
import {
  AttachmentInput,
  ConversationMessage,
  Memory,
} from '../types/jarvis';
import { useVoiceAssistant } from '../lib/voice';

interface ChatViewProps {
  messages: ConversationMessage[];
  memory: Memory;
  isLoading: boolean;
  onSendMessage: (text: string, attachment?: AttachmentInput) => Promise<void>;
  onConfirmAction: (token: string) => Promise<void>;
  onCancelAction: (token: string) => Promise<void>;
  onClearHistory: () => Promise<void>;
  isDark: boolean;
}

const SUGGESTED_COMMANDS = [
  'JARVIS, quais são meus projetos?',
  'JARVIS, consulte minha escala.',
  'JARVIS, quem trabalha amanhã?',
  'JARVIS, analise a escala e procure erros.',
  'JARVIS, quanto ganhei essa semana?',
  'E descontando combustível?',
  'E no mês passado?',
  'JARVIS, quanto gastei com combustível?',
  'JARVIS, analise meus ganhos.',
  'JARVIS, exclua essa despesa.',
];

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  memory,
  isLoading,
  onSendMessage,
  onConfirmAction,
  onCancelAction,
  onClearHistory,
  isDark,
}) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<AttachmentInput | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedToolsMsgId, setExpandedToolsMsgId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const {
    isListening,
    isSpeaking,
    voiceError,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useVoiceAssistant((transcript) => {
    setInput(transcript);
    onSendMessage(transcript, attachment);
    setInput('');
    setAttachment(undefined);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!memory.preferences.autoSpeakResponses || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role === 'assistant' && last.id !== 'msg_welcome') {
      speakText(last.content, memory.preferences.speechRate);
    }
  }, [messages, memory.preferences.autoSpeakResponses, memory.preferences.speechRate, speakText]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !attachment) || isLoading) return;
    const currentAttachment = attachment;
    setInput('');
    setAttachment(undefined);
    await onSendMessage(trimmed || `Analise o arquivo anexado: ${currentAttachment?.name}`, currentAttachment);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.type)) {
      setUploadError(`Formato não suportado (${file.type || 'desconhecido'}). Envie PNG, JPEG, WEBP ou PDF.`);
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). O limite máximo por arquivo é 10 MB.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = typeof reader.result === 'string' ? reader.result : '';
      setAttachment({
        name: file.name,
        mimeType: file.type || 'image/png',
        base64Data: base64,
        sizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderFormattedContent = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const formattedLine = line
        .split(/(\*\*.*?\*\*|`.*?`)/g)
        .map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className={isDark ? 'font-semibold text-white' : 'font-semibold text-slate-900'}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code
                key={pIdx}
                className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                  isDark ? 'bg-slate-800 text-sky-300' : 'bg-slate-200 text-sky-800'
                }`}
              >
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        });

      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
          {formattedLine}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] md:h-[calc(100vh-4.5rem)] max-w-5xl mx-auto w-full">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b text-xs ${
          isDark ? 'border-slate-800/80 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="font-medium text-sky-400">Contexto Ativo:</span>
          <span>Projeto: {memory.shortTerm.lastProject || 'Global'}</span>
          <span aria-hidden="true">·</span>
          <span>Período: {memory.shortTerm.lastPeriod || 'semana'}</span>
          {memory.shortTerm.lastToolCalled && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Última tool: {memory.shortTerm.lastToolCalled}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-1 text-amber-400 hover:underline whitespace-nowrap"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Parar Voz</span>
            </button>
          )}
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 hover:text-rose-400 transition-colors whitespace-nowrap"
            title="Reiniciar conversa e limpar contexto de curto prazo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Sessão</span>
          </button>
        </div>
      </div>

      <div
        className={`px-4 py-2.5 border-b overflow-x-auto flex items-center gap-2 ${
          isDark ? 'border-slate-800/60 bg-slate-950/60' : 'border-slate-200 bg-white'
        }`}
      >
        {SUGGESTED_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => onSendMessage(cmd)}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors border ${
              isDark
                ? 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-sky-500/50 hover:text-sky-300'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cmd}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const hasTools = msg.toolResults && msg.toolResults.length > 0;
          const isToolsExpanded = expandedToolsMsgId === msg.id || memory.preferences.showStructuredToolOutput;

          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                <span className="font-semibold">{isUser ? 'Você' : 'JARVIS'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {!isUser && msg.intent && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-sky-400">intent: {msg.intent.intent}</span>
                  </>
                )}
                {!isUser && (
                  <button
                    onClick={() => speakText(msg.content, memory.preferences.speechRate)}
                    className="ml-1 text-slate-400 hover:text-sky-400 transition-colors"
                    title="Ouvir resposta por voz (TTS)"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div
                className={`max-w-2xl w-full sm:w-auto rounded-2xl px-4 py-3.5 text-sm border ${
                  isUser
                    ? 'bg-sky-500 text-slate-950 font-medium border-sky-400'
                    : isDark
                    ? 'bg-slate-900/90 text-slate-100 border-slate-800'
                    : 'bg-white text-slate-800 border-slate-200 shadow-xs'
                }`}
              >
                {msg.attachment && (
                  <div className="mb-2.5 flex items-center gap-2 pb-2 border-b border-black/10 text-xs">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate font-mono">{msg.attachment.name}</span>
                    <span>({msg.attachment.mimeType})</span>
                  </div>
                )}

                <div className="space-y-1">{renderFormattedContent(msg.content)}</div>

                {msg.pendingConfirmation && (
                  <div
                    className={`mt-4 pt-3 border-t ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-amber-400">
                        Permissão Requerida: {msg.pendingConfirmation.permission}
                      </span>
                      <span className="font-mono text-slate-400">
                        Ferramenta: {msg.pendingConfirmation.toolName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-2">
                      <button
                        onClick={() => onConfirmAction(msg.pendingConfirmation!.token)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors min-h-[40px]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar e Executar</span>
                      </button>
                      <button
                        onClick={() => onCancelAction(msg.pendingConfirmation!.token)}
                        disabled={isLoading}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[40px] ${
                          isDark
                            ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                )}

                {hasTools && (
                  <div
                    className={`mt-3 pt-2.5 border-t text-xs ${
                      isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Terminal className="w-3.5 h-3.5 text-sky-400" />
                        {msg.toolResults!.map((tr, idx) => (
                          <span key={idx} className="font-mono">
                            {tr.toolName} · {tr.project} · Permissão: {tr.permission} ·{' '}
                            {tr.isMock ? 'Dados: MOCK' : 'Dados: API Real'} · {tr.durationMs}ms
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setExpandedToolsMsgId(expandedToolsMsgId === msg.id ? null : msg.id)
                        }
                        className="text-sky-400 hover:underline whitespace-nowrap shrink-0"
                      >
                        {isToolsExpanded ? 'Ocultar JSON' : 'Ver JSON'}
                      </button>
                    </div>

                    {isToolsExpanded && (
                      <pre
                        className={`mt-2 p-2.5 rounded-lg overflow-x-auto text-[11px] font-mono max-h-56 ${
                          isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {JSON.stringify(
                          msg.toolResults!.map((t) => ({
                            acaoRealizada: t.toolName,
                            projeto: t.project,
                            permissao: t.permission,
                            sucesso: t.success,
                            isMock: t.isMock,
                            resultado: t.data,
                          })),
                          null,
                          2
                        )}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-sky-400 px-2 py-2">
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>JARVIS orquestrando ferramentas e validando resposta...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {(voiceError || attachment || uploadError) && (
        <div
          className={`px-4 py-2 border-t text-xs flex items-center justify-between ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          {uploadError ? (
            <div className="flex items-center justify-between w-full text-rose-400">
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="hover:underline ml-2">Fechar</button>
            </div>
          ) : attachment ? (
            <div className="flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Anexo pronto: <strong>{attachment.name}</strong>
              </span>
              <button
                onClick={() => setAttachment(undefined)}
                className="text-rose-400 hover:underline ml-2"
              >
                Remover
              </button>
            </div>
          ) : (
            <span className="text-amber-400">{voiceError}</span>
          )}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className={`p-3 border-t flex items-center gap-2 ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center border transition-colors shrink-0 ${
            isDark
              ? 'border-slate-800 bg-slate-950 text-slate-300 hover:border-sky-500/50 hover:text-sky-400'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
          title="Anexar imagem de escala, comprovante ou documento (Visão Multimodal)"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center border transition-all shrink-0 ${
            isListening
              ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
              : isDark
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
              : 'border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100'
          }`}
          title={isListening ? 'Parar gravação de voz' : 'Comando por Voz (JARVIS)'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isListening
              ? 'Ouvindo seu comando para o JARVIS...'
              : 'Chame "JARVIS, quem trabalha amanhã?" ou "Quanto ganhei essa semana?"'
          }
          className={`flex-1 min-h-[44px] px-4 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
          }`}
        />

        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !attachment)}
          className="min-h-[44px] px-4 rounded-xl bg-sky-500 text-slate-950 font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-sky-400 disabled:opacity-40 transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
};

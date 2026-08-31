import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Page } from '../App';
import { apiRequest } from '../api/client';

interface AIPageProps {
    onNavigate: (page: Page) => void;
}

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

async function chat(message: string, history: Message[]): Promise<string> {
    const res = await apiRequest('/ai/public-chat', {
        method: 'POST',
        body: JSON.stringify({
            message,
            history: history.map(h => ({ role: h.role, text: h.text })),
        }),
    });
    return (res?.reply ?? res?.data?.reply ?? '') as string;
}

function MarkdownText({ text }: { text: string }) {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    const renderInline = (raw: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
        let last = 0;
        let m: RegExpExecArray | null;
        let key = 0;
        while ((m = regex.exec(raw)) !== null) {
            if (m.index > last) parts.push(raw.slice(last, m.index));
            if (m[2] !== undefined) parts.push(<strong key={key++} className="font-bold text-white">{m[2]}</strong>);
            else if (m[3] !== undefined) parts.push(<em key={key++} className="italic text-slate-300">{m[3]}</em>);
            else if (m[4] !== undefined) parts.push(<code key={key++} className="bg-white/[0.08] text-[#FCA5A5] px-1.5 py-0.5 rounded text-[12px] font-mono">{m[4]}</code>);
            last = m.index + m[0].length;
        }
        if (last < raw.length) parts.push(raw.slice(last));
        return parts;
    };

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === '') { i++; continue; }
        if (/^(\d+|[١-٩][٠-٩]*)\.\s/.test(trimmed)) {
            const listItems: React.ReactNode[] = [];
            while (i < lines.length && /^(\d+|[١-٩][٠-٩]*)\.\s/.test(lines[i].trim())) {
                const content = lines[i].trim().replace(/^(\d+|[١-٩][٠-٩]*)\.\s/, '');
                listItems.push(
                    <li key={i} className="flex gap-2 items-start">
                        <span className="text-[#EF4444] font-bold text-sm mt-0.5 flex-shrink-0">
                            {lines[i].trim().match(/^(\d+|[١-٩][٠-٩]*)/)?.[0]}.
                        </span>
                        <span>{renderInline(content)}</span>
                    </li>
                );
                i++;
            }
            elements.push(<ol key={`ol-${i}`} className="space-y-1.5 my-2">{listItems}</ol>);
            continue;
        }
        if (/^[\*\-•]\s/.test(trimmed)) {
            const listItems: React.ReactNode[] = [];
            while (i < lines.length && /^[\*\-•]\s/.test(lines[i].trim())) {
                const content = lines[i].trim().replace(/^[\*\-•]\s/, '');
                listItems.push(
                    <li key={i} className="flex gap-2 items-start">
                        <span className="text-[#EF4444] mt-1.5 flex-shrink-0">
                            <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="3"/></svg>
                        </span>
                        <span>{renderInline(content)}</span>
                    </li>
                );
                i++;
            }
            elements.push(<ul key={`ul-${i}`} className="space-y-1.5 my-2">{listItems}</ul>);
            continue;
        }
        if (/^\*\*[^*]+\*\*[:\.]?\s*$/.test(trimmed)) {
            elements.push(
                <p key={i} className="font-bold text-white text-[15px] mt-3 mb-1">
                    {renderInline(trimmed)}
                </p>
            );
            i++;
            continue;
        }
        elements.push(
            <p key={i} className="leading-relaxed text-slate-200">
                {renderInline(trimmed)}
            </p>
        );
        i++;
    }
    return <div className="space-y-1">{elements}</div>;
}

function TypingIndicator({ done }: { done: boolean }) {
    const DOTS = 9;
    const delays = [0, 133, 266, 400, 533, 666, 800, 933, 1066];
    return (
        <div className="flex gap-2 sm:gap-3" role="status" aria-label="جاري التفكير">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#DC2626]/30 to-[#3B82F6]/30 shadow-inner">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
            </div>
            <div className="px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06] flex items-center justify-center min-w-[64px] min-h-[40px]">
                {!done && (
                    <div className="grid gap-[5px]" style={{ gridTemplateColumns: 'repeat(3, 7px)' }}>
                        {Array.from({ length: DOTS }).map((_, idx) => (
                            <span
                                key={idx}
                                className="block w-[7px] h-[7px] rounded-full bg-[#EF4444] animate-pulse"
                                style={{ animationDelay: `${delays[idx]}ms`, animationDuration: '1.2s' }}
                            />
                        ))}
                    </div>
                )}
                {done && (
                    <span className="animate-scale-in flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                            <path d="M50,18 C33,18 22,30 22,46 C22,68 50,86 50,86 C50,86 78,68 78,46 C78,30 67,18 50,18 Z" fill="url(#ai-grad)" />
                            <circle cx="38" cy="44" r="5" fill="white" opacity="0.95"/>
                            <circle cx="62" cy="44" r="5" fill="white" opacity="0.95"/>
                            <circle cx="39.5" cy="45.5" r="2.5" fill="#1E3A8A"/>
                            <circle cx="63.5" cy="45.5" r="2.5" fill="#1E3A8A"/>
                            <path d="M38,58 Q50,68 62,58" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9"/>
                            <defs>
                                <linearGradient id="ai-grad" x1="22" y1="18" x2="78" y2="86" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#DC2626"/>
                                    <stop offset="100%" stopColor="#1E3A8A"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </span>
                )}
            </div>
        </div>
    );
}

const SUGGESTIONS = [
    'اشرح لي درس في مادة Science',
    'ما أهم المفاهيم في منهج الصف الخامس الابتدائي؟',
    'جهز لي خطة مذاكرة لمنهج العلوم',
    'ما الفرق بين التغير الفيزيائي والكيميائي؟',
];

const AIPage: React.FC<AIPageProps> = ({ onNavigate }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingDone, setLoadingDone] = useState(false);
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || loading) return;
        setError('');
        setLoadingDone(false);
        const userMsg: Message = { role: 'user', text: trimmed };
        const snapshot = [...messages, userMsg];
        setMessages(snapshot);
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        setLoading(true);
        try {
            const reply = await chat(trimmed, messages);
            if (!reply) throw new Error('empty');
            setLoadingDone(true);
            await new Promise(r => setTimeout(r, 600));
            setMessages([...snapshot, { role: 'assistant', text: reply }]);
        } catch {
            setError('حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.');
        }
        setLoading(false);
        setLoadingDone(false);
    }, [messages, loading]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send(input);
        }
    };

    const isEmpty = messages.length === 0;

    return (
        <div dir="rtl" className="flex flex-col h-screen bg-gradient-to-b from-[#070f1a] via-[#0a1628] to-[#0d1f33] font-cairo text-slate-200 overflow-hidden">
            <header className="flex-shrink-0 bg-[#0a1628]/80 backdrop-blur-xl border-b border-white/[0.05] px-3 sm:px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => onNavigate('home')}
                        className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-none p-1.5 rounded-lg hover:bg-white/[0.06]"
                        aria-label="رجوع للرئيسية"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <div className="w-[1px] h-6 bg-white/[0.06]" aria-hidden="true" />
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[#DC2626] to-sky-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#DC2626]/20 ai-avatar-pop">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-100 leading-tight">المساعد الذكي للعلوم</div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] inline-block animate-pulse" aria-hidden="true"></span>
                                <span className="text-[10px] sm:text-[11px] text-[#EF4444]">متصل</span>
                            </div>
                        </div>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={() => { setMessages([]); setError(''); }}
                        className="text-slate-500 hover:text-slate-300 text-xs font-cairo cursor-pointer bg-transparent border-none transition-colors px-2 py-1.5 rounded-lg hover:bg-white/[0.06]"
                    >
                        محادثة جديدة
                    </button>
                )}
            </header>

            <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 scroll-smooth">
                <div className="max-w-3xl mx-auto">
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-2">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#DC2626]/15 to-[#3B82F6]/15 flex items-center justify-center mb-4 sm:mb-5 border border-white/[0.06] shadow-xl shadow-[#DC2626]/5 gloss-in gdelay-1">
                                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                                </svg>
                            </div>
                            <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 mb-2 gloss-in gdelay-2">كيف يمكنني مساعدتك في العلوم؟</h2>
                            <p className="text-slate-500 text-xs sm:text-sm mb-6 sm:mb-8 max-w-xs gloss-in gdelay-3">اسألني عن مادة Science وسأساعدك</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                                {SUGGESTIONS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => send(s)}
                                        className="text-right px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 text-xs sm:text-sm hover:bg-white/[0.07] hover:border-[#DC2626]/30 hover:text-slate-100 transition-all duration-200 cursor-pointer font-cairo"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-5">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-inner ${
                                            msg.role === 'user'
                                                ? 'bg-sky-600/30 text-sky-300'
                                                : 'bg-gradient-to-br from-[#DC2626]/20 to-[#3B82F6]/20 text-[#EF4444]'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {msg.role === 'user' ? (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        ) : (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div
                                        className={`max-w-[85%] sm:max-w-[80%] px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-gradient-to-br from-sky-600/30 to-blue-700/30 text-slate-100 rounded-tr-sm border border-white/[0.06] shadow-md'
                                                : 'bg-white/[0.04] border border-white/[0.06] text-slate-200 rounded-tl-sm shadow-sm'
                                        }`}
                                    >
                                        {msg.role === 'user'
                                            ? msg.text
                                            : <MarkdownText text={msg.text} />
                                        }
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <TypingIndicator done={loadingDone} />
                            )}

                            {error && (
                                <div role="alert" className="text-center text-red-400 text-xs sm:text-sm py-2 px-3 sm:px-4 bg-red-500/10 rounded-xl border border-red-500/20">
                                    {error}
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </div>
            </main>

            <div className="flex-shrink-0 bg-gradient-to-t from-[#070f1a] via-[#0a1628] to-transparent pt-3 sm:pt-4 pb-2 sm:pb-3">
                <div className="max-w-3xl mx-auto px-3 sm:px-4">
                    <div className="flex gap-2 sm:gap-3 items-end bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1.5 sm:p-2 shadow-xl shadow-black/20 backdrop-blur-sm">
                        <div className="flex-1">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onInput={e => {
                                    const t = e.currentTarget;
                                    t.style.height = 'auto';
                                    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                                }}
                                placeholder="اكتب سؤالك هنا..."
                                rows={1}
                                disabled={loading}
                                aria-label="رسالتك للمساعد الذكي"
                                className="font-cairo w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-transparent text-slate-200 text-sm outline-none transition-colors duration-150 resize-none disabled:opacity-50 placeholder-slate-600 border-none"
                                style={{ minHeight: '42px', maxHeight: '120px' }}
                            />
                        </div>
                        <button
                            onClick={() => send(input)}
                            disabled={!input.trim() || loading}
                            aria-label="إرسال"
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#DC2626] to-sky-600 flex items-center justify-center flex-shrink-0 cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-lg hover:shadow-[#DC2626]/25 transition-all duration-200"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <p className="text-center text-[10px] sm:text-[11px] text-slate-600 mt-2 font-cairo">
                        مدعوم بالذكاء الاصطناعي — للأغراض التعليمية فقط
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIPage;

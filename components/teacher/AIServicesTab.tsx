import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    createConversation, getConversations, getConversation, deleteConversation, sendMessage,
    generateAiImage, generateAiMindMap,
} from '../../api/ai.api';
import { useToast } from '../../contexts/ToastContext';

interface ChatMessage {
    id?: number;
    role: string;
    content: string;
}

interface Conversation {
    id: string;
    title: string;
    messages?: ChatMessage[];
}

interface MindMapNode {
    id: string;
    label: string;
    color?: string;
    children: MindMapNode[];
}

// ── Simple markdown-ish renderer (Arabic) ───────────────────────────────────
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    const renderInline = (raw: string, keyBase: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
        let last = 0, m: RegExpExecArray | null, k = 0;
        while ((m = regex.exec(raw)) !== null) {
            if (m.index > last) parts.push(raw.slice(last, m.index));
            if (m[2] !== undefined) parts.push(<strong key={`${keyBase}-b${k}`} className="font-bold text-[#0f2233]">{m[2]}</strong>);
            else if (m[3] !== undefined) parts.push(<em key={`${keyBase}-i${k}`} className="italic text-slate-500">{m[3]}</em>);
            else if (m[4] !== undefined) parts.push(<code key={`${keyBase}-c${k}`} className="bg-slate-100 text-amber-700 px-1.5 py-0.5 rounded text-[12px] font-mono">{m[4]}</code>);
            last = m.index + m[0].length;
            k++;
        }
        if (last < raw.length) parts.push(<span key={`${keyBase}-r`}>{raw.slice(last)}</span>);
        return parts;
    };
    while (i < lines.length) {
        const trimmed = lines[i].trim();
        if (trimmed === '') { i++; continue; }
        if (trimmed.startsWith('## ')) {
            elements.push(<h4 key={i} className="font-extrabold text-[#0f2233] text-[15px] mt-3 mb-1">{renderInline(trimmed.slice(3), `h${i}`)}</h4>);
            i++; continue;
        }
        if (/^(\d+|[١-٩][٠-٩]*)\.\s/.test(trimmed)) {
            const items: React.ReactNode[] = [];
            while (i < lines.length && /^(\d+|[١-٩][٠-٩]*)\.\s/.test(lines[i].trim())) {
                const content = lines[i].trim().replace(/^(\d+|[١-٩][٠-٩]*)\.\s/, '');
                items.push(
                    <li key={i} className="flex gap-2 items-start mb-1">
                        <span className="text-amber-600 font-bold text-sm flex-shrink-0">{lines[i].trim().match(/^(\d+|[١-٩][٠-٩]*)/)?.[0]}.</span>
                        <span>{renderInline(content, `ol${i}`)}</span>
                    </li>
                );
                i++;
            }
            elements.push(<ol key={`ol${i}`} className="my-1.5">{items}</ol>);
            continue;
        }
        if (/^[\*\-•]\s/.test(trimmed)) {
            const items: React.ReactNode[] = [];
            while (i < lines.length && /^[\*\-•]\s/.test(lines[i].trim())) {
                items.push(
                    <li key={i} className="flex gap-2 items-start mb-1">
                        <span className="text-amber-500 mt-1.5 flex-shrink-0"><svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3" /></svg></span>
                        <span>{renderInline(lines[i].trim().replace(/^[\*\-•]\s/, ''), `ul${i}`)}</span>
                    </li>
                );
                i++;
            }
            elements.push(<ul key={`ul${i}`} className="my-1.5">{items}</ul>);
            continue;
        }
        if (/^\*\*[^*]+\*\*[:\.]?\s*$/.test(trimmed)) {
            elements.push(<p key={i} className="font-bold text-[#0f2233] text-[14px] mt-3 mb-1">{renderInline(trimmed.replace(/^\*\*|\*\*$/g, ''), `p${i}`)}</p>);
            i++; continue;
        }
        elements.push(<p key={i} className="leading-relaxed text-slate-600">{renderInline(trimmed, `p${i}`)}</p>);
        i++;
    }
    return <div className="space-y-1">{elements}</div>;
};

// ── Chat panel ───────────────────────────────────────────────────────────────
const ChatPanel: React.FC = () => {
    const { showToast } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const loadList = useCallback(async () => {
        setListLoading(true);
        try {
            const res: any = await getConversations();
            const list = Array.isArray(res?.data) ? res.data : [];
            setConversations(list);
            if (list.length > 0 && !activeId) loadOne(list[0].id);
        } catch {
            showToast('فشل تحميل المحادثات', 'error');
        }
        setListLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId, showToast]);

    const loadOne = async (id: string) => {
        setActiveId(id);
        setMessages([]);
        try {
            const res: any = await getConversation(id);
            const c: Conversation = res?.data;
            if (c) {
                setMessages((c.messages || []).map(m => ({ role: m.role, content: m.content })));
                setConversations(prev => prev.map(p => p.id === id ? { ...p, title: c.title } : p));
            }
        } catch {
            showToast('تعذر تحميل المحادثة', 'error');
        }
    };

    useEffect(() => { loadList(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const startNew = async () => {
        const title = prompt('اسم المحادثة:');
        if (!title?.trim()) return;
        try {
            const res: any = await createConversation(title.trim());
            const c: Conversation = res?.data;
            if (c) {
                await loadList();
                setActiveId(c.id);
                setMessages([]);
            }
        } catch {
            showToast('تعذر إنشاء المحادثة', 'error');
        }
    };

    const removeConv = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeId === id) { setActiveId(null); setMessages([]); const next = conversations.find(c => c.id !== id); if (next) loadOne(next.id); }
        } catch {
            showToast('تعذر حذف المحادثة', 'error');
        }
    };

    const send = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading || !activeId) return;
        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        try {
            const res: any = await sendMessage(activeId, trimmed);
            const reply: ChatMessage = res?.data;
            if (reply) setMessages(prev => [...prev, { role: reply.role || 'assistant', content: reply.content }]);
            else setMessages(prev => [...prev, { role: 'assistant', content: 'لم أتمكن من توليد رد.' }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'حدث خطأ في الاتصال. حاول مرة أخرى.' }]);
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '14px', minHeight: '540px' }}>
            {/* Conversations list */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                    <button onClick={startNew} style={{ flex: 1, background: 'linear-gradient(90deg,#f59e0b,#d97706)', border: 'none', borderRadius: '10px', padding: '9px', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
                        + محادثة جديدة
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {listLoading ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '12px', fontFamily: "'Cairo', sans-serif" }}>جاري التحميل...</div>
                    ) : conversations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '12px', fontFamily: "'Cairo', sans-serif" }}>لا توجد محادثات بعد</div>
                    ) : (
                        conversations.map(c => (
                            <div key={c.id}
                                onClick={() => loadOne(c.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                                    padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                                    background: activeId === c.id ? 'rgba(245,158,11,0.08)' : 'transparent',
                                    transition: 'background 0.15s',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = activeId === c.id ? 'rgba(245,158,11,0.08)' : '#f8fafc'}
                                onMouseOut={e => e.currentTarget.style.background = activeId === c.id ? 'rgba(245,158,11,0.08)' : 'transparent'}
                            >
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f2233', fontFamily: "'Cairo', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                    {c.title}
                                </span>
                                <button onClick={(e) => removeConv(c.id, e)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px', flexShrink: 0 }} title="حذف">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat thread */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>المحادثة</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
                    {messages.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', fontFamily: "'Cairo', sans-serif" }}>
                            اسأل المساعد الذكي عن أي موضوع دراسي أو طلب إداري
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end' }}>
                            <div style={{
                                maxWidth: '82%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.8,
                                background: m.role === 'user' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#ffffff',
                                color: m.role === 'user' ? '#fff' : '#334155',
                                border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                                boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                                fontFamily: "'Cairo', sans-serif",
                            }}>
                                {m.role === 'user' ? m.content : <SimpleMarkdown text={m.content} />}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '5px' }}>
                                {[0, 1, 2].map(d => (
                                    <span key={d} className="block w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: `${d * 150}ms`, animationDuration: '1s' }} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
                <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') send(); }}
                        placeholder="اكتب سؤالك هنا..."
                        disabled={loading || !activeId}
                        style={{ flex: 1, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f2233', fontSize: '13px', fontFamily: "'Cairo', sans-serif", outline: 'none' }}
                    />
                    <button onClick={send} disabled={!input.trim() || loading || !activeId}
                        style={{ background: 'linear-gradient(90deg,#f59e0b,#d97706)', border: 'none', borderRadius: '10px', padding: '0 18px', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!input.trim() || loading || !activeId) ? 0.4 : 1, fontFamily: "'Cairo', sans-serif" }}>
                        إرسال
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Image generation panel ───────────────────────────────────────────────────
const ImagePanel: React.FC = () => {
    const { showToast } = useToast();
    const [prompt, setPrompt] = useState('');
    const [ratio, setRatio] = useState('1:1');
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState('');

    const generate = async () => {
        if (!prompt.trim() || generating) return;
        setGenerating(true);
        setError('');
        setResult(null);
        try {
            const res: any = await generateAiImage(prompt.trim(), ratio);
            const dataUrl = res?.data?.dataUrl || res?.dataUrl;
            if (!dataUrl) throw new Error('empty');
            setResult(dataUrl);
        } catch {
            setError('تعذّر توليد الصورة — حاول مرة أخرى لاحقاً');
        }
        setGenerating(false);
    };

    const download = () => {
        if (!result) return;
        const link = document.createElement('a');
        link.href = result;
        link.download = `ai-image-${Date.now()}.png`;
        link.click();
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>وصف الصورة</h4>
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={5}
                    placeholder="مثال: رسمة توضيحية ملونة عن دورة حياة الفراشة لطلاب المرحلة الابتدائية، بأسلوب كرتوني لطيف..."
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', color: '#0f2233', fontSize: '13px', fontFamily: "'Cairo', sans-serif", outline: 'none', resize: 'vertical' }}
                />
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f2233', marginBottom: '6px', fontFamily: "'Cairo', sans-serif" }}>نسبة الأبعاد</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[['1:1', 'مربع'], ['16:9', 'عريض'], ['9:16', 'طويل']].map(([v, l]) => (
                            <button key={v} onClick={() => setRatio(v)}
                                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: ratio === v ? '1px solid #f59e0b' : '1px solid #e2e8f0', background: ratio === v ? 'rgba(245,158,11,0.1)' : '#f8fafc', color: ratio === v ? '#d97706' : '#64748b', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={generate} disabled={!prompt.trim() || generating}
                    style={{ background: 'linear-gradient(90deg,#f59e0b,#d97706)', border: 'none', borderRadius: '10px', padding: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!prompt.trim() || generating) ? 0.4 : 1, fontFamily: "'Cairo', sans-serif" }}>
                    {generating ? 'جاري التوليد...' : 'توليد الصورة ✨'}
                </button>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif" }}>
                    استخدم وصفاً واضحاً ومفصلاً لنتيجة أفضل. الصور تُولَّد بالذكاء الاصطناعي لأغراض تعليمية.
                </p>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '360px', position: 'relative' }}>
                {generating ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontFamily: "'Cairo', sans-serif" }}>
                        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                        <div style={{ fontSize: '12px' }}>جاري توليد الصورة...</div>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '13px', fontFamily: "'Cairo', sans-serif", padding: '20px' }}>{error}</div>
                ) : result ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <img src={result} alt="منتجة بالذكاء الاصطناعي" style={{ flex: 1, width: '100%', objectFit: 'contain', borderBottom: '1px solid #f1f5f9' }} />
                        <div style={{ padding: '10px', display: 'flex', justifyContent: 'center' }}>
                            <button onClick={download} style={{ background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', border: 'none', borderRadius: '8px', padding: '8px 20px', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
                                تحميل الصورة
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontFamily: "'Cairo', sans-serif", padding: '20px' }}>
                        <div style={{ fontSize: '38px', marginBottom: '8px' }}>🎨</div>
                        <div style={{ fontSize: '13px' }}>ستظهر الصورة المولّدة هنا</div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Mind-map panel ───────────────────────────────────────────────────────────
interface LayoutNode {
    node: MindMapNode;
    depth: number;
    x: number;
    y: number;
    col: number;
    parentCol: number | null;
}

const NodeColor = ['#f59e0b', '#38bdf8', '#34d399', '#a78bfa', '#f472b6', '#fb923c', '#22d3ee'];

const MindMapPanel: React.FC = () => {
    const { showToast } = useToast();
    const [topic, setTopic] = useState('');
    const [generating, setGenerating] = useState(false);
    const [root, setRoot] = useState<MindMapNode | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');

    const generate = async () => {
        if (!topic.trim() || generating) return;
        setGenerating(true);
        setError('');
        setRoot(null);
        setCollapsed(new Set());
        try {
            const res: any = await generateAiMindMap(topic.trim());
            const r: MindMapNode = res?.data?.root;
            if (!r || !r.label) throw new Error('empty');
            setRoot(r);
        } catch {
            setError('تعذّر توليد الخريطة الذهنية — حاول مرة أخرى لاحقاً');
        }
        setGenerating(false);
    };

    const toggle = (id: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const layout = useCallback((): LayoutNode[] | null => {
        if (!root) return null;
        const layered: LayoutNode[] = [];
        const t2 = (n: MindMapNode, depth: number, parentCol: number | null, colRef: { v: number }) => {
            const col = colRef.v;
            layered.push({ node: n, depth, x: 0, y: 0, col, parentCol });
            colRef.v += 1;
            if (collapsed.has(n.id)) return;
            for (const c of n.children) t2(c, depth + 1, col, colRef);
        };
        const ref = { v: 0 };
        t2(root, 0, null, ref);
        return layered;
    }, [root, collapsed]);

    const layered = layout();

    const COL_W = 180;
    const ROW_H = 84;
    const NODE_W = 168;
    const NODE_H = 52;
    const H = (layered || []).length * ROW_H;
    const W = (Math.max(0, ...(layered || []).map(l => l.depth + 1)) + 1) * COL_W;

    const colPos = (l: LayoutNode) => ({
        x: l.depth * COL_W + (COL_W - NODE_W) / 2,
        y: l.col * ROW_H + (ROW_H - NODE_H) / 2,
    });

    const download = () => {
        if (!layered) return;
        const canvas = document.createElement('canvas');
        canvas.width = W + 40; canvas.height = H + 40;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const posMap = new Map<number, { x: number; y: number }>();
        for (const l of layered) posMap.set(l.col, colPos(l));
        ctx.lineWidth = 2; ctx.strokeStyle = '#cbd5e1';
        for (const l of layered) {
            if (l.parentCol === null) continue;
            const p = posMap.get(l.parentCol)!;
            const c = posMap.get(l.col)!;
            ctx.beginPath();
            ctx.moveTo(p.x + NODE_W, p.y + NODE_H / 2);
            ctx.bezierCurveTo(p.x + NODE_W + 40, p.y + NODE_H / 2, c.x - 40, c.y + NODE_H / 2, c.x, c.y + NODE_H / 2);
            ctx.stroke();
        }
        for (const l of layered) {
            const pos = posMap.get(l.col)!;
            const x = pos.x + 20, y = pos.y + 20;
            ctx.fillStyle = NodeColor[l.depth % NodeColor.length];
            roundRect(ctx, x, y, NODE_W, NODE_H, 14); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Cairo, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const label = l.node.label.length > 26 ? l.node.label.slice(0, 25) + '…' : l.node.label;
            ctx.fillText(label, x + NODE_W / 2, y + NODE_H / 2);
        }
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `mindmap-${Date.now()}.png`;
        link.click();
    };

    const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    };

    return (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') generate(); }}
                    placeholder="اكتب موضوع الخريطة الذهنية... مثال: قوانين نيوتن للحركة"
                    style={{ flex: 1, minWidth: '220px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#0f2233', fontSize: '13px', fontFamily: "'Cairo', sans-serif", outline: 'none' }}
                />
                <button onClick={generate} disabled={!topic.trim() || generating}
                    style={{ background: 'linear-gradient(90deg,#f59e0b,#d97706)', border: 'none', borderRadius: '10px', padding: '0 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!topic.trim() || generating) ? 0.4 : 1, fontFamily: "'Cairo', sans-serif" }}>
                    {generating ? 'جاري التوليد...' : 'توليد الخريطة'}
                </button>
                {root && layered && (
                    <button onClick={download} style={{ background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', border: 'none', borderRadius: '10px', padding: '0 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
                        تحميل PNG
                    </button>
                )}
            </div>

            {error && <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '13px', fontFamily: "'Cairo', sans-serif", padding: '16px' }}>{error}</div>}

            {!root && !error && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif" }}>
                    <div style={{ fontSize: '38px', marginBottom: '8px' }}>🗺️</div>
                    <div style={{ fontSize: '13px' }}>اكتب الموضوع واضغط "توليد الخريطة" — وستظهر هنا خريطة ذهنية تفاعلية عالية الجودة</div>
                </div>
            )}

            {root && layered && (
                <div style={{ width: 'fit-content', minWidth: '100%', position: 'relative' }}>
                    <svg width={W} height={H} style={{ display: 'block', position: 'absolute', inset: 0, top: 0, left: 0 }}>
                        {layered.map(l => {
                            if (l.parentCol === null) return null;
                            const parent = layered.find(p => p.col === l.parentCol);
                            if (!parent) return null;
                            const p = colPos(parent);
                            const c = colPos(l);
                            return <path key={`e-${l.col}`} d={`M ${p.x + NODE_W} ${p.y + NODE_H / 2} C ${p.x + NODE_W + 40} ${p.y + NODE_H / 2}, ${c.x - 40} ${c.y + NODE_H / 2}, ${c.x} ${c.y + NODE_H / 2}`} stroke="#cbd5e1" strokeWidth="2" fill="none" />;
                        })}
                    </svg>
                    {layered.map(l => {
                        const pos = colPos(l);
                        return (
                            <div key={l.col}
                                onClick={() => toggle(l.node.id)}
                                style={{
                                    position: 'absolute',
                                    top: pos.y,
                                    left: pos.x,
                                    width: NODE_W, height: NODE_H,
                                    background: `linear-gradient(135deg, ${NodeColor[l.depth % NodeColor.length]}, ${NodeColor[l.depth % NodeColor.length]}cc)`,
                                    borderRadius: '14px', color: '#fff', fontWeight: 700, fontSize: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                                    padding: '6px 10px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(15,23,42,0.12)',
                                    fontFamily: "'Cairo', sans-serif", lineHeight: 1.4,
                                    transition: 'transform 0.15s',
                                    boxSizing: 'border-box',
                                }}
                                draggable={false}
                                onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                title={l.node.children.length > 0 ? (collapsed.has(l.node.id) ? 'اضغط للعرض' : 'اضغط للطي') : ''}
                            >
                                {l.node.label}
                                {l.node.children.length > 0 && (
                                    <span style={{ position: 'absolute', top: '-6px', left: '-6px', background: '#0f2233', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cairo', sans-serif" }}>
                                        {l.node.children.length}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── Main tab ─────────────────────────────────────────────────────────────────
const AIServicesTab: React.FC = () => {
    const [active, setActive] = useState<'chat' | 'image' | 'mindmap'>('chat');

    const tabs = [
        { key: 'chat' as const, label: 'المحادثة', icon: '💬' },
        { key: 'image' as const, label: 'توليد الصور', icon: '🎨' },
        { key: 'mindmap' as const, label: 'الخرائط الذهنية', icon: '🗺️' },
    ];

    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }} className="space-y-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f2233', margin: 0, fontFamily: "'Cairo', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                    خدمات الذكاء الاصطناعي
                </h2>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '6px', width: 'fit-content' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setActive(t.key)}
                        style={{
                            padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                            background: active === t.key ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'transparent',
                            color: active === t.key ? '#fff' : '#64748b',
                            border: 'none', fontFamily: "'Cairo', sans-serif",
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s',
                        }}>
                        <span>{t.icon}</span>{t.label}
                    </button>
                ))}
            </div>

            {active === 'chat' && <ChatPanel />}
            {active === 'image' && <ImagePanel />}
            {active === 'mindmap' && <MindMapPanel />}
        </div>
    );
};

export default AIServicesTab;
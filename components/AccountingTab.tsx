import React, { useState, useEffect, useCallback } from 'react';
import {
    Transaction, TransactionType, ServiceType, PaymentMethod,
    getTransactions, createTransaction, updateTransaction, deleteTransaction,
    getTeacherTransactions, createTeacherTransaction, updateTeacherTransaction, deleteTeacherTransaction,
    computeStats, formatCurrency, exportToCSV,
} from '../api/accounting.api';

// ── Shared UI ──────────────────────────────────────────────────

function Btn({ children, onClick, variant = 'primary', small = false, disabled = false, type = 'button' }: {
    children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
    small?: boolean; disabled?: boolean; type?: 'button' | 'submit';
}) {
    const styles: Record<string, string> = {
        primary: 'bg-[#1E3A8A] hover:bg-[#0d1f33] text-white border-[#1E3A8A]/30',
        secondary: 'bg-[#1E3A8A]/[0.06] hover:bg-[#1E3A8A]/[0.12] text-[#1E3A8A] border-[#1E3A8A]/15',
        danger: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
        success: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200',
        warning: 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200',
        ghost: 'bg-transparent hover:bg-[#1E3A8A]/[0.05] text-slate-500 border-transparent',
    };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`font-cairo cursor-pointer transition-all duration-150 rounded-lg font-semibold border ${small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-[13px]'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${styles[variant]}`}
        >
            {children}
        </button>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "font-cairo w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all duration-150 placeholder:text-slate-400";
const selectCls = `${inputCls} appearance-none cursor-pointer select-light`;

const SERVICES: ServiceType[] = ['قدرات', 'تحصيلي', 'قدرات + تحصيلي', 'اشتراك شهري', 'أخرى'];
const PAYMENT_METHODS: PaymentMethod[] = ['تحويل بنكي', 'مدى', 'فيزا', 'كاش', 'STC Pay'];

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, color, sub, icon }: {
    label: string; value: string; color: string; sub?: string; icon: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 hover:shadow-lg hover:shadow-[#1E3A8A]/5 hover:border-slate-200 transition-all duration-200">
            <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[12px] text-slate-500 m-0">{label}</p>
                    <p className="text-2xl font-extrabold leading-tight m-0" style={{ color }}>{value}</p>
                    {sub && <p className="text-[11px] text-slate-400 m-0 mt-0.5">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

// ── Currency badge (EGP only) ──────────────────────────────────
function CurrencyBadge() {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ml-1.5 bg-amber-50 text-amber-600 border-amber-100">
            ج.م
        </span>
    );
}

// ── Close Icon ────────────────────────────────────────────────
function CloseBtn({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-[#0f2233] cursor-pointer transition-colors border-none"
            aria-label="إغلاق"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    );
}

// ── Modal Shell ────────────────────────────────────────────────
function ModalShell({ onClose, children, maxWidth = 'max-w-md', scrollable = false }: {
    onClose: () => void; children: React.ReactNode; maxWidth?: string; scrollable?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" dir="rtl">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 bg-white border border-slate-200 rounded-2xl p-6 w-full ${maxWidth}${scrollable ? ' max-h-[90vh] overflow-y-auto' : ''} shadow-2xl`}>
                {children}
            </div>
        </div>
    );
}

// ── Transaction Modal ──────────────────────────────────────────
interface TxModalProps {
    initial?: Transaction | null;
    onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
    onClose: () => void;
    saving: boolean;
}

function TxModal({ initial, onSave, onClose, saving }: TxModalProps) {
    const today = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({
        studentName: initial?.studentName || '',
        date: initial?.date || today,
        service: (initial?.service || 'قدرات') as ServiceType,
        amount: initial?.amount?.toString() || '',
        type: (initial?.type || 'income') as TransactionType,
        invoiceNumber: initial?.invoiceNumber || '',
        paymentMethod: (initial?.paymentMethod || 'تحويل بنكي') as PaymentMethod,
        contactNumber: initial?.contactNumber || '',
        notes: initial?.notes || '',
    });

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.studentName.trim() || !form.amount || !form.date) return;
        await onSave({
            studentName: form.studentName.trim(),
            date: form.date,
            service: form.service,
            amount: parseFloat(form.amount) || 0,
            currency: 'EGP',
            type: form.type,
            invoiceNumber: form.invoiceNumber || undefined,
            paymentMethod: form.paymentMethod || undefined,
            contactNumber: form.contactNumber || undefined,
            notes: form.notes || undefined,
        });
    };

    return (
        <ModalShell onClose={onClose} maxWidth="max-w-lg" scrollable>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-cairo text-[#0f2233] text-base font-bold m-0">
                    {initial ? 'تعديل المعاملة' : 'إضافة معاملة جديدة'}
                </h3>
                <CloseBtn onClick={onClose} />
            </div>
            <form onSubmit={handleSubmit}>
                <Field label="اسم الطالب / الجهة">
                    <input className={inputCls} value={form.studentName} onChange={e => set('studentName', e.target.value)} required placeholder="أدخل الاسم" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="الخدمة">
                        <select className={selectCls} value={form.service} onChange={e => set('service', e.target.value)}>
                            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="نوع المعاملة">
                        <select className={selectCls} value={form.type} onChange={e => set('type', e.target.value)}>
                            <option value="income">إيرادات</option>
                            <option value="expense">مصروفات</option>
                        </select>
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="المبلغ (ج.م)">
                        <input className={inputCls} type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" />
                    </Field>
                    <Field label="تاريخ المعاملة">
                        <input className={inputCls} type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="طريقة الدفع">
                        <select className={selectCls} value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </Field>
                    <Field label="رقم الفاتورة">
                        <input className={inputCls} value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} placeholder="INV-001" />
                    </Field>
                </div>
                <Field label="رقم التواصل">
                    <input className={inputCls} value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} placeholder="01xxxxxxxx" />
                </Field>
                <Field label="ملاحظات">
                    <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات اختيارية..." />
                </Field>
                <div className="mb-5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-[12px] text-amber-700 flex items-center gap-2">
                    <span>العملة:</span>
                    <span className="font-bold">جنيه مصري (ج.م)</span>
                </div>
                <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                    <Btn onClick={onClose} variant="secondary">إلغاء</Btn>
                    <Btn type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ المعاملة'}</Btn>
                </div>
            </form>
        </ModalShell>
    );
}

function InvoiceModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
    const handlePrint = () => {
        const el = document.getElementById('invoice-print-area');
        if (!el) return;
        const win = window.open('', '_blank', 'width=600,height=700');
        if (!win) return;
        win.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>فاتورة</title>
            <style>body{font-family:Cairo,sans-serif;padding:24px;color:#0f172a}
            .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
            .label{color:#64748b}.value{font-weight:600}</style></head>
            <body>${el.innerHTML}</body></html>`);
        win.document.close();
        win.focus();
        win.print();
        win.close();
    };

    const rows: [string, string][] = [
        ['رقم الفاتورة', tx.invoiceNumber || '—'],
        ['الطالب / الجهة', tx.studentName],
        ['الخدمة', tx.service],
        ['المبلغ', formatCurrency(tx.amount, 'EGP')],
        ['النوع', tx.type === 'income' ? 'إيرادات' : 'مصروفات'],
        ['طريقة الدفع', tx.paymentMethod || '—'],
        ['التاريخ', tx.date],
        ['رقم التواصل', tx.contactNumber || '—'],
        ['ملاحظات', tx.notes || '—'],
    ];

    return (
        <ModalShell onClose={onClose} maxWidth="max-w-md" scrollable>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-cairo text-[#0f2233] text-base font-bold m-0">تفاصيل الفاتورة</h3>
                <CloseBtn onClick={onClose} />
            </div>
            <div id="invoice-print-area" className="space-y-0 mb-6">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm font-cairo">{k}</span>
                        <span className="text-slate-700 text-sm font-cairo font-medium">{v}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                <Btn onClick={onClose} variant="secondary">إغلاق</Btn>
                <Btn onClick={handlePrint}>طباعة الفاتورة</Btn>
            </div>
        </ModalShell>
    );
}

// ── Confirm Delete ─────────────────────────────────────────────
function ConfirmModal({ label, onConfirm, onClose }: { label: string; onConfirm: () => void; onClose: () => void }) {
    return (
        <ModalShell onClose={onClose} maxWidth="max-w-sm">
            <div className="flex items-start gap-3 mb-6">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                </div>
                <div>
                    <p className="font-cairo text-[#0f2233] font-semibold mb-1 m-0">حذف المعاملة</p>
                    <p className="font-cairo text-slate-500 text-sm m-0">هل أنت متأكد من حذف معاملة <strong className="text-[#0f2233]">{label}</strong>؟ لا يمكن التراجع.</p>
                </div>
            </div>
            <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                <Btn onClick={onClose} variant="secondary">إلغاء</Btn>
                <Btn onClick={onConfirm} variant="danger">حذف</Btn>
            </div>
        </ModalShell>
    );
}

// ── Main AccountingTab Component ───────────────────────────────
interface AccountingTabProps {
    mode?: 'admin' | 'teacher';
    teacherId?: string;
    showToast: (msg: string, ok?: boolean) => void;
}

const AccountingTab: React.FC<AccountingTabProps> = ({ mode = 'admin', teacherId, showToast }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<'add' | 'edit' | 'invoice' | 'delete' | null>(null);
    const [selected, setSelected] = useState<Transaction | null>(null);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
    const [filterService, setFilterService] = useState<'all' | ServiceType>('all');
    const [filterMethod, setFilterMethod] = useState<'all' | PaymentMethod>('all');

    const isTeacher = mode === 'teacher';

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = isTeacher && teacherId
                ? await getTeacherTransactions(teacherId)
                : await getTransactions();
            setTransactions(data);
        } catch {
            showToast('فشل تحميل المعاملات', false);
        }
        setLoading(false);
    }, [isTeacher, teacherId, showToast]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
        setSaving(true);
        try {
            if (modal === 'edit' && selected) {
                if (isTeacher && teacherId) {
                    await updateTeacherTransaction(selected.id, data, teacherId);
                } else {
                    await updateTransaction(selected.id, data);
                }
                showToast('تم تحديث المعاملة', true);
            } else {
                if (isTeacher && teacherId) {
                    await createTeacherTransaction({ ...data, teacherId }, teacherId);
                } else {
                    await createTransaction(data);
                }
                showToast('تمت إضافة المعاملة', true);
            }
            setModal(null);
            setSelected(null);
            await load();
        } catch {
            showToast('حدث خطأ أثناء الحفظ', false);
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selected) return;
        try {
            if (isTeacher) {
                await deleteTeacherTransaction(selected.id);
            } else {
                await deleteTransaction(selected.id);
            }
            showToast('تم حذف المعاملة', true);
            setModal(null);
            setSelected(null);
            await load();
        } catch {
            showToast('فشل الحذف', false);
        }
    };

    const filtered = transactions.filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterService !== 'all' && t.service !== filterService) return false;
        if (filterMethod !== 'all' && t.paymentMethod !== filterMethod) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                t.studentName.toLowerCase().includes(q) ||
                (t.invoiceNumber || '').toLowerCase().includes(q) ||
                (t.contactNumber || '').includes(q) ||
                (t.notes || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    const stats = computeStats(transactions);

    const resetFilters = () => {
        setSearch(''); setFilterType('all'); setFilterService('all');
        setFilterMethod('all');
    };

    const hasFilters = search || filterType !== 'all' || filterService !== 'all' || filterMethod !== 'all';

    const IncomeIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,6 23,6 23,12" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    const ExpenseIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,18 13.5,8.5 8.5,13.5 1,6" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,18 23,18 23,12" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    const ProfitIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    const StudentsIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/></svg>;

    return (
        <div dir="rtl" className="font-cairo">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h2 className="font-cairo text-[#0f2233] text-lg font-bold m-0">
                        {isTeacher ? 'حساباتي' : 'نظام الحسابات'}
                    </h2>
                    <p className="text-slate-500 text-[13px] mt-1 m-0">
                        {isTeacher ? 'إدارة إيراداتك ومصروفاتك' : 'إدارة الإيرادات والمصروفات'}
                    </p>
                </div>
                <div className="flex gap-2.5">
                    <Btn onClick={() => exportToCSV(filtered)} variant="secondary">
                        <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="7,10 12,15 17,10" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            تصدير CSV
                        </span>
                    </Btn>
                    <Btn onClick={() => { setSelected(null); setModal('add'); }}>
                        <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            إضافة معاملة
                        </span>
                    </Btn>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard label="إجمالي الإيرادات" value={formatCurrency(stats.totalIncome, 'EGP')} color="#16a34a" sub={`↑ ${stats.incomeCount} معاملة`} icon={IncomeIcon} />
                <StatCard label="إجمالي المصروفات" value={formatCurrency(stats.totalExpenses, 'EGP')} color="#dc2626" sub={`↓ ${stats.expenseCount} معاملة`} icon={ExpenseIcon} />
                <StatCard label="صافي الربح" value={formatCurrency(stats.netProfit, 'EGP')} color={stats.netProfit >= 0 ? '#7c3aed' : '#dc2626'} sub="الفرق الصافي" icon={ProfitIcon} />
                <StatCard label="الطلاب المسجلون" value={String(stats.totalStudents)} color="#0284c7" sub="من سجل الإيرادات" icon={StudentsIcon} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2.5 mb-4 items-center">
                <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <input
                        className="font-cairo w-full pr-9 pl-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all duration-150 placeholder:text-slate-400"
                        placeholder="بحث بالاسم أو الفاتورة..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className={`${selectCls} w-auto min-w-[110px]`} value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                    <option value="all">كل الأنواع</option>
                    <option value="income">إيرادات</option>
                    <option value="expense">مصروفات</option>
                </select>
                <select className={`${selectCls} w-auto min-w-[130px]`} value={filterService} onChange={e => setFilterService(e.target.value as any)}>
                    <option value="all">كل الخدمات</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={`${selectCls} w-auto min-w-[120px]`} value={filterMethod} onChange={e => setFilterMethod(e.target.value as any)}>
                    <option value="all">كل الطرق</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {hasFilters && (
                    <Btn onClick={resetFilters} variant="ghost" small>↺ إعادة ضبط</Btn>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                    <span className="font-cairo text-[#0f2233] text-sm font-semibold">سجل المعاملات</span>
                    <span className="text-slate-500 text-[12px]">{filtered.length} معاملة</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm" role="table">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {['#', 'الاسم', 'التاريخ', 'الخدمة', 'المبلغ', 'النوع', 'الفاتورة', 'الدفع', 'التواصل', 'ملاحظات', 'إجراءات'].map(h => (
                                    <th key={h} className="font-cairo px-4 py-3 text-right text-[11px] text-slate-500 font-semibold whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1,2,3,4,5].map(i => (
                                    <tr key={i} className="border-b border-slate-100">
                                        {Array(11).fill(0).map((_, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="animate-pulse bg-slate-100 rounded-lg h-4 w-full" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-16 text-slate-500 font-cairo">
                                        <svg className="w-12 h-12 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        <p className="m-0">{hasFilters ? 'لا توجد معاملات مطابقة للفلتر' : 'لا توجد معاملات بعد'}</p>
                                    </td>
                                </tr>
                            ) : filtered.map((tx, idx) => (
                                <tr key={tx.id} className="border-b border-slate-100 hover:bg-[#1E3A8A]/[0.03] transition-colors duration-100">
                                    <td className="px-4 py-3 text-slate-400 text-[12px]">{idx + 1}</td>
                                    <td className="px-4 py-3 text-[#0f2233] font-medium whitespace-nowrap">{tx.studentName}</td>
                                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[12px]">{tx.date}</td>
                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-[12px]">{tx.service}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="font-bold" style={{ color: tx.type === 'income' ? '#16a34a' : '#dc2626' }}>
                                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, 'EGP')}
                                        </span>
                                        <CurrencyBadge />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                                            style={{
                                                background: tx.type === 'income' ? '#16a34a15' : '#dc262615',
                                                color: tx.type === 'income' ? '#16a34a' : '#dc2626',
                                                borderColor: tx.type === 'income' ? '#16a34a30' : '#dc262630',
                                            }}
                                        >
                                            {tx.type === 'income' ? 'إيرادات' : 'مصروفات'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-[12px]">{tx.invoiceNumber || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500 text-[12px] whitespace-nowrap">{tx.paymentMethod || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500 text-[12px]" style={{ direction: 'ltr' }}>{tx.contactNumber || '—'}</td>
                                    <td className="px-4 py-3 text-slate-400 text-[12px] max-w-[120px] truncate">{tx.notes || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1.5">
                                            <Btn small onClick={() => { setSelected(tx); setModal('invoice'); }} variant="secondary">فاتورة</Btn>
                                            <Btn small onClick={() => { setSelected(tx); setModal('edit'); }} variant="secondary">تعديل</Btn>
                                            <Btn small onClick={() => { setSelected(tx); setModal('delete'); }} variant="danger">حذف</Btn>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {(modal === 'add' || modal === 'edit') && (
                <TxModal
                    initial={modal === 'edit' ? selected : null}
                    onSave={handleSave}
                    onClose={() => { setModal(null); setSelected(null); }}
                    saving={saving}
                />
            )}
            {modal === 'invoice' && selected && (
                <InvoiceModal tx={selected} onClose={() => { setModal(null); setSelected(null); }} />
            )}
            {modal === 'delete' && selected && (
                <ConfirmModal
                    label={selected.studentName}
                    onConfirm={handleDelete}
                    onClose={() => { setModal(null); setSelected(null); }}
                />
            )}
        </div>
    );
};

export default AccountingTab;
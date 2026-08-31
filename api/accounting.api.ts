import { apiRequest } from "./client";

// ── Types ──────────────────────────────────────────────────────
export type TransactionType = 'income' | 'expense';
export type ServiceType = 'قدرات' | 'تحصيلي' | 'قدرات + تحصيلي' | 'اشتراك شهري' | 'أخرى';
export type PaymentMethod = 'تحويل بنكي' | 'مدى' | 'فيزا' | 'كاش' | 'STC Pay';
export type Currency = 'SAR' | 'EGP';

export interface Transaction {
    id: string;
    studentName: string;
    date: string;
    service: ServiceType;
    amount: number;
    currency: Currency;
    type: TransactionType;
    invoiceNumber?: string;
    paymentMethod?: PaymentMethod;
    contactNumber?: string;
    notes?: string;
    createdAt: string;
    teacherId?: string;
}

export interface AccountingStats {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalStudents: number;
    activeCourses: number;
    incomeCount: number;
    expenseCount: number;
}

// ── LocalStorage helpers ───────────────────────────────────────
const ADMIN_KEY = 'mohamedatta_transactions';
const TEACHER_KEY = 'mohamedatta_teacher_transactions';

function loadLocal(key: string): Transaction[] {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveLocal(key: string, txs: Transaction[]): void {
    localStorage.setItem(key, JSON.stringify(txs));
}
function generateId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Admin Accounting API ───────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
    try {
        const res = await apiRequest('/admin/accounting/transactions');
        if (res?.data && Array.isArray(res.data)) {
            const serverData = res.data as Transaction[];
            const localData = loadLocal(ADMIN_KEY);
            if (localData.length > 0) {
                const serverIds = new Set(serverData.map((t: Transaction) => t.id));
                const unsynced = localData.filter(t => !serverIds.has(t.id));
                if (unsynced.length > 0) {
                    Promise.all(
                        unsynced.map(t =>
                            apiRequest('/admin/accounting/transactions', {
                                method: 'POST',
                                body: JSON.stringify(t),
                            }).catch(() => null)
                        )
                    ).then(results => {
                        const synced = results.filter(Boolean).length;
                        if (synced > 0) {
                            const syncedIds = new Set(unsynced.map(t => t.id));
                            saveLocal(ADMIN_KEY, localData.filter(t => !syncedIds.has(t.id)));
                        }
                    });
                    return [...unsynced, ...serverData].sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                }
            }
            return serverData;
        }
    } catch { /* backend not ready, use localStorage */ }
    return loadLocal(ADMIN_KEY);
}

export async function createTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const tx: Transaction = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    try {
        const res = await apiRequest('/admin/accounting/transactions', {
            method: 'POST',
            body: JSON.stringify(tx),
        });
        if (res?.data) {
            // Sync: remove from localStorage if backend accepted it
            const local = loadLocal(ADMIN_KEY).filter(t => t.id !== tx.id);
            saveLocal(ADMIN_KEY, local);
            return res.data as Transaction;
        }
    } catch { /* fall through to localStorage */ }
    const txs = loadLocal(ADMIN_KEY);
    txs.unshift(tx);
    saveLocal(ADMIN_KEY, txs);
    return tx;
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    try {
        const res = await apiRequest(`/admin/accounting/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (res?.data) return res.data as Transaction;
    } catch { /* fall through */ }
    const txs = loadLocal(ADMIN_KEY);
    const idx = txs.findIndex(t => t.id === id);
    if (idx !== -1) {
        txs[idx] = { ...txs[idx], ...data };
        saveLocal(ADMIN_KEY, txs);
        return txs[idx];
    }
    throw new Error('Transaction not found');
}

export async function deleteTransaction(id: string): Promise<void> {
    try {
        await apiRequest(`/admin/accounting/transactions/${id}`, { method: 'DELETE' });
    } catch { /* fall through */ }
    // Always remove from localStorage too
    saveLocal(ADMIN_KEY, loadLocal(ADMIN_KEY).filter(t => t.id !== id));
}

// ── Teacher Accounting API ─────────────────────────────────────

export async function getTeacherTransactions(teacherId: string): Promise<Transaction[]> {
    try {
        const res = await apiRequest('/teacher/accounting/transactions');
        if (res?.data && Array.isArray(res.data)) {
            const serverData = res.data as Transaction[];
            // Sync any localStorage-only transactions up to the backend
            const localData = loadLocal(TEACHER_KEY).filter(t => !t.teacherId || t.teacherId === teacherId);
            if (localData.length > 0) {
                const serverIds = new Set(serverData.map((t: Transaction) => t.id));
                const unsynced = localData.filter(t => !serverIds.has(t.id));
                if (unsynced.length > 0) {
                    // Fire-and-forget sync — push each unsynced tx to backend
                    Promise.all(
                        unsynced.map(t =>
                            apiRequest('/teacher/accounting/transactions', {
                                method: 'POST',
                                body: JSON.stringify({ ...t, teacherId }),
                            }).catch(() => null)
                        )
                    ).then(results => {
                        const synced = results.filter(Boolean).length;
                        if (synced > 0) {
                            // Clear synced items from localStorage
                            const syncedIds = new Set(unsynced.map(t => t.id));
                            saveLocal(TEACHER_KEY, localData.filter(t => !syncedIds.has(t.id)));
                        }
                    });
                    // Return merged immediately while sync happens in background
                    return [...unsynced, ...serverData].sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                }
            }
            return serverData;
        }
    } catch { /* backend not ready */ }
    return loadLocal(TEACHER_KEY).filter(t => !t.teacherId || t.teacherId === teacherId);
}

export async function createTeacherTransaction(
    data: Omit<Transaction, 'id' | 'createdAt'>,
    teacherId: string
): Promise<Transaction> {
    const tx: Transaction = { ...data, id: generateId(), teacherId, createdAt: new Date().toISOString() };
    try {
        const res = await apiRequest('/teacher/accounting/transactions', {
            method: 'POST',
            body: JSON.stringify(tx),
        });
        if (res?.data) {
            const local = loadLocal(TEACHER_KEY).filter(t => t.id !== tx.id);
            saveLocal(TEACHER_KEY, local);
            return res.data as Transaction;
        }
    } catch { /* fall through */ }
    const txs = loadLocal(TEACHER_KEY);
    txs.unshift(tx);
    saveLocal(TEACHER_KEY, txs);
    return tx;
}

export async function updateTeacherTransaction(id: string, data: Partial<Transaction>, teacherId: string): Promise<Transaction> {
    // No dedicated PUT endpoint for teacher — delete + recreate via backend, or update locally
    try {
        await apiRequest(`/teacher/accounting/transactions/${id}`, { method: 'DELETE' });
        const res = await apiRequest('/teacher/accounting/transactions', {
            method: 'POST',
            body: JSON.stringify({ ...data, id, teacherId }),
        });
        if (res?.data) return res.data as Transaction;
    } catch { /* fall through */ }
    const txs = loadLocal(TEACHER_KEY);
    const idx = txs.findIndex(t => t.id === id);
    if (idx !== -1) {
        txs[idx] = { ...txs[idx], ...data };
        saveLocal(TEACHER_KEY, txs);
        return txs[idx];
    }
    throw new Error('Transaction not found');
}

export async function deleteTeacherTransaction(id: string): Promise<void> {
    try {
        await apiRequest(`/teacher/accounting/transactions/${id}`, { method: 'DELETE' });
    } catch { /* fall through */ }
    saveLocal(TEACHER_KEY, loadLocal(TEACHER_KEY).filter(t => t.id !== id));
}

// ── Currency helpers ───────────────────────────────────────────

export function detectCurrency(phoneNumber?: string): Currency {
    if (!phoneNumber) return 'SAR';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.startsWith('20') || cleaned.startsWith('01')) return 'EGP';
    if (cleaned.startsWith('966') || cleaned.startsWith('05')) return 'SAR';
    return 'SAR';
}

export function formatCurrency(amount: number, currency: Currency): string {
    if (currency === 'EGP') return `${amount.toLocaleString('ar-EG')} ج.م`;
    return `${amount.toLocaleString('ar-SA')} ج.م`;
}

export function computeStats(txs: Transaction[]): AccountingStats {
    const income = txs.filter(t => t.type === 'income');
    const expenses = txs.filter(t => t.type === 'expense');
    return {
        totalIncome: income.reduce((s, t) => s + t.amount, 0),
        totalExpenses: expenses.reduce((s, t) => s + t.amount, 0),
        netProfit: income.reduce((s, t) => s + t.amount, 0) - expenses.reduce((s, t) => s + t.amount, 0),
        totalStudents: new Set(income.map(t => t.studentName)).size,
        activeCourses: 0,
        incomeCount: income.length,
        expenseCount: expenses.length,
    };
}

export function exportToCSV(txs: Transaction[]): void {
    const headers = ['#', 'اسم الطالب', 'التاريخ', 'الخدمة', 'المبلغ', 'العملة', 'النوع', 'رقم الفاتورة', 'طريقة الدفع', 'التواصل', 'ملاحظات'];
    const rows = txs.map((t, i) => [
        i + 1, t.studentName, t.date, t.service, t.amount, t.currency,
        t.type === 'income' ? 'إيرادات' : 'مصروفات',
        t.invoiceNumber || '', t.paymentMethod || '', t.contactNumber || '', t.notes || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

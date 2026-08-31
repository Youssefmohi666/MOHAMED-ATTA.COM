import React from 'react';
import { Page, AccountType } from '../App';

interface PaymentFailedPageProps {
    onNavigate: (page: Page, payload?: { accountType?: AccountType; courseId?: string | number }) => void;
}

const PaymentFailedPage: React.FC<PaymentFailedPageProps> = ({ onNavigate }) => {
    const ref = new URLSearchParams(window.location.search).get('ref');

    return (
        <div dir="rtl" className="bg-[#FAF6EB] min-h-screen flex items-center justify-center py-20 px-4" style={{ fontFamily: "'Cairo', sans-serif" }}>
            <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-10 text-center max-w-md w-full">
                {/* Icon */}
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <h1 className="text-2xl font-black text-[#1E3A8A] mb-2">فشلت عملية الدفع</h1>
                <p className="text-[#1E3A8A]/60 mb-2">لم تتم عملية الدفع بنجاح. يرجى المحاولة مرة أخرى.</p>

                {ref && (
                    <p className="text-xs text-[#1E3A8A]/40 font-mono mb-6" dir="ltr">ref: {ref}</p>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-right">
                    <p className="text-sm text-amber-800 font-medium mb-1">أسباب شائعة لفشل الدفع:</p>
                    <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                        <li>رصيد غير كافٍ في البطاقة أو المحفظة</li>
                        <li>بيانات البطاقة غير صحيحة</li>
                        <li>انتهاء صلاحية الجلسة</li>
                        <li>رفض من البنك</li>
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => onNavigate('courses')}
                        className="w-full py-4 bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold rounded-xl transition-colors cursor-pointer"
                    >
                        حاول مرة أخرى
                    </button>
                    <button
                        onClick={() => onNavigate('home')}
                        className="w-full py-4 border-2 border-[#DBEAFE] text-[#1E3A8A] font-bold rounded-xl hover:bg-[#F8FAFA] transition-colors cursor-pointer"
                    >
                        العودة للرئيسية
                    </button>
                </div>

                <p className="text-xs text-[#1E3A8A]/40 mt-6">
                    إذا استمرت المشكلة، تواصل مع{' '}
                    <button
                        onClick={() => onNavigate('contact')}
                        className="text-[#DC2626] underline cursor-pointer"
                    >
                        الدعم الفني
                    </button>
                </p>
            </div>
        </div>
    );
};

export default PaymentFailedPage;

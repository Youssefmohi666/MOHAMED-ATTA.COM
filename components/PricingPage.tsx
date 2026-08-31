
import React from 'react';
import { Page } from '../App';
import CheckBadgeIcon from './icons/CheckBadgeIcon';

interface PricingPageProps {
    onNavigate: (page: Page) => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
    return (
        <div dir="rtl" className="bg-[#FAF6EB] min-h-screen py-20 px-4" style={{ fontFamily: "'Cairo', sans-serif" }}>
                <div className="text-center mb-16">
                    <p className="text-[#1E3A8A]/60 text-lg max-w-2xl mx-auto gloss-in gdelay-1">
                        اختر الخطة المناسبة لتعلم العلوم. سواء كنت مبتدئاً أو متقدماً، لدينا ما يناسبك.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Free Plan */}
                    <div className="gloss-card p-8 relative overflow-hidden group gloss-in">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 group-hover:bg-[#1E3A8A] transition-colors duration-200" />
                        <h3 className="text-2xl font-bold text-[#1E3A8A] mb-2">الأساسية</h3>
                        <div className="text-4xl font-black text-[#1E3A8A] mb-6">مجاناً<span className="text-base font-normal text-gray-400">/للأبد</span></div>
                        <p className="text-gray-500 mb-8">بداية مثالية لاستكشاف عالم العلوم.</p>
                        <button onClick={() => onNavigate('signup')} className="w-full py-3 border-2 border-[#1E3A8A] text-[#1E3A8A] font-bold rounded-xl hover:bg-[#1E3A8A] hover:text-white transition-colors duration-200 cursor-pointer mb-8 hover-shine">
                            سجل مجاناً
                        </button>
                        <ul className="space-y-4">
                            {['الوصول للكورسات المجانية', 'مساعد AI محدود', 'دعم المجتمع'].map((feat, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-gray-600">
                                    <CheckBadgeIcon className="w-5 h-5 text-gray-300" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-[#1E3A8A] rounded-2xl p-8 shadow-2xl border border-[#1E3A8A] transform md:-translate-y-4 relative overflow-hidden group gloss-in gdelay-2">
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-[#DC2626] to-[#EF4444] text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-[0_6px_16px_-6px_rgba(220,38,38,0.55)]">الأكثر طلباً</div>
                        <h3 className="text-2xl font-bold text-white mb-2">الاحترافية</h3>
                        <div className="text-4xl font-black text-white mb-6">299<span className="text-base font-normal text-white/60">/شهرياً</span></div>
                        <p className="text-white/70 mb-8">كل ما تحتاجه لتصبح متميزاً في مادة العلوم.</p>
                        <button onClick={() => onNavigate('signup')} className="w-full py-3 bg-[#DC2626] text-white font-bold rounded-xl hover:bg-[#991B1B] transition-colors duration-200 cursor-pointer mb-8 shadow-lg shadow-[#DC2626]/30 hover-shine">
                            اشترك الآن
                        </button>
                        <ul className="space-y-4">
                            {['كل مميزات الخطة المجانية', 'الوصول لجميع الكورسات', 'شروحات AI متقدمة', 'شهادات إتمام معتمدة', 'مساعد AI ذكي بلا حدود', 'دعم فني مباشر'].map((feat, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-white">
                                    <CheckBadgeIcon className="w-5 h-5 text-[#DC2626]" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Business Plan */}
                    <div className="gloss-card p-8 relative overflow-hidden group gloss-in gdelay-3">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 group-hover:bg-[#DC2626] transition-colors duration-200" />
                        <h3 className="text-2xl font-bold text-[#1E3A8A] mb-2">للشركات</h3>
                        <div className="text-4xl font-black text-[#1E3A8A] mb-6">تواصل<span className="text-base font-normal text-gray-400">/معنا</span></div>
                        <p className="text-gray-500 mb-8">حلول مخصصة لتدريب فرق العمل.</p>
                        <button onClick={() => onNavigate('about')} className="w-full py-3 border-2 border-[#DC2626] text-[#DC2626] font-bold rounded-xl hover:bg-[#DC2626] hover:text-white transition-colors duration-200 cursor-pointer mb-8 hover-shine">
                            تواصل معنا
                        </button>
                        <ul className="space-y-4">
                            {['لوحة تحكم للمدراء', 'تتبع تقدم الموظفين', 'مسارات تعليمية مخصصة', 'دعم فني مخصص', 'فواتير ضريبية'].map((feat, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-gray-600">
                                    <CheckBadgeIcon className="w-5 h-5 text-[#DC2626]" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
    );
};

export default PricingPage;

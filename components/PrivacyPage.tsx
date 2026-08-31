
import React from 'react';
import { Page } from '../App';

interface PrivacyPageProps {
    onNavigate: (page: Page) => void;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate }) => {
    return (
        <div dir="rtl" className="bg-[#FAF6EB] min-h-screen py-20 px-4">
            <div className="container mx-auto max-w-4xl gloss-card p-8 md:p-12">
                <h1 className="text-4xl font-black text-[#1E3A8A] mb-8 text-center pb-8 border-b border-gray-100 gloss-in gdelay-1">السياسات والخصوصية</h1>

                <div className="space-y-12">
                    <section className="reveal reveal-delay-1">
                        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">1. سياسة الخصوصية</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            نحن في "منصة محمد عطا" نلتزم بحماية خصوصية جميع مستخدمينا، ونقدر ثقتكم بنا. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 mr-4">
                            <li>نقوم بجمع البيانات الأساسية لإنشاء حسابك (الاسم، البريد الإلكتروني).</li>
                            <li>نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك وتذكر تفضيلاتك.</li>
                            <li>لا نشارك معلوماتك الشخصية مع أي طرف ثالث لأغراض التسويق دون موافقتك الصريحة.</li>
                        </ul>
                    </section>

                    <section className="reveal reveal-delay-2">
                        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">2. الشروط والأحكام</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            باستخدامك لموقع "محمد عطا"، فإنك توافق على الالتزام بشروط الاستخدام هذه والقوانين المعمول بها.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 mr-4">
                            <li>      يمنع استخدام المنصة لأي غرض غير قانوني أو غير مصرح به.</li>
                            <li>      جميع حقوق الملكية الفكرية للمحتوى الموجود على المنصة محفوظة لنا أو لشركائنا.</li>
                            <li>نحتفظ بالحق في تعليق أو إنهاء حسابك إذا انتهكت هذه الشروط.</li>
                        </ul>
                    </section>

                    <section className="reveal reveal-delay-3">
                        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">3. التحديثات</h2>
                        <p className="text-gray-600 leading-relaxed">
                            قد نقوم بتحديث هذه السياسة من وقت لآخر لتعكس التغييرات في ممارساتنا أو القوانين ذات الصلة. سيتم إشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار بارز في الموقع.
                        </p>
                    </section>

                    <div className="pt-8 border-t border-gray-100 mt-8 text-center">
                        <p className="text-sm text-gray-500">آخر تحديث: 23 مارس 2026</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;

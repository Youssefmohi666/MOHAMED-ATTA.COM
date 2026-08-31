
import React from 'react';
import { Page } from '../App';

interface BlogPageProps {
    onNavigate: (page: Page) => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ onNavigate }) => {
    return (
        <div dir="rtl" className="bg-[#FAF6EB] min-h-screen py-20 px-4 font-cairo">
            <div className="container mx-auto max-w-5xl">
                <h1 className="text-4xl font-black text-[#1E3A8A] mb-12 text-center gloss-in gdelay-1">مدونة العلوم</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                        { title: 'كيف تذاكر مادة Science بذكاء؟', date: '5 مارس 2026', author: 'محمد عطا', img: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', desc: 'خطة عملية لمذاكرة مادة Science من الرابع الابتدائي حتى الأول الثانوي.' },
                        { title: 'كيف تستخدم الذكاء الاصطناعي في تعلم العلوم؟', date: '20 فبراير 2026', author: 'محمد عطا', img: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', desc: 'دليل شامل لاستخدام أدوات الذكاء الاصطناعي في مذاكرة مادة Science.' },
                        { title: 'تجارب علمية يمكنك القيام بها في المنزل', date: '15 فبراير 2026', author: 'محمد عطا', img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', desc: 'مجموعة من التجارب العلمية البسيطة والآمنة التي يمكنك تجربتها لفهم مفاهيم مادة العلوم.' },
                        { title: 'نصائح للنجاح في اختبارات Science', date: '10 فبراير 2026', author: 'محمد عطا', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', desc: 'استراتيجيات فعّالة للتحضير لاختبارات مادة Science والنجاح فيها.' }
                    ].map((post, idx) => (
                        <div key={idx} className={`gloss-card hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 overflow-hidden group reveal reveal-delay-${idx % 4 + 1}`}>
                            <div className="relative h-56 overflow-hidden">
                                <img src={post.img} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#1E3A8A] border border-[#DBEAFE]">{post.date}</div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-[#1E3A8A] mb-3 group-hover:text-[#DC2626] transition-colors">{post.title}</h3>
                                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{post.desc}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-[#DC2626]">بقلم: {post.author}</span>
                                    <button className="text-[#1E3A8A] font-bold text-sm hover:underline hover:text-[#DC2626] cursor-pointer transition-colors duration-200">اقرأ المزيد &larr;</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlogPage;

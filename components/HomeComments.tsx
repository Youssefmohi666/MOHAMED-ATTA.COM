import React, { useEffect, useRef, useState } from 'react';
import { getTestimonials, postComment } from '../api/content.api';
import { useAuth } from '../contexts/AuthContext';
import { sanitizePlainText } from '../utils/validation';

interface CommentItem {
  id: number;
  name: string;
  role: string;
  text: string;
  createdAt?: string;
}

const useInView = (threshold = 0.1) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

const HomeComments: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { user, isLoggedIn } = useAuth();
  const { ref, visible } = useInView();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadComments = async () => {
    const list = await getTestimonials();
    setComments(list.map((c: any) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      text: c.text,
      createdAt: c.createdAt,
    })));
    setLoading(false);
  };

  useEffect(() => {
    loadComments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onNavigate('login');
      return;
    }
    const clean = sanitizePlainText(text, 1000);
    if (clean.length < 2) {
      setError('اكتب تعليقاً لا يقل عن حرفين');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await postComment({ content: clean });
      setText('');
      await loadComments();
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال التعليق، حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section dir="rtl" className="py-20 md:py-28 px-4 bg-[#FAF3E2] dark:bg-[#0a1628]" ref={ref}>
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <div className="gloss-in inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white font-bold text-xs mb-5 shadow-lg shadow-[#1E3A8A]/25">
            تعليقات الطلاب
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white mb-3 leading-tight">
            شاركنا <span className="text-[#DC2626]">رأيك</span>
          </h2>
          <p className="text-[#64748b] dark:text-slate-400 text-lg">
            طلابنا المسجَّلون فقط يستطيعون إضافة تعليقات
          </p>
        </div>

        <div className="gloss-card rounded-2xl p-6 md:p-8 mb-10 transition-all duration-700" style={{ transitionDelay: '120ms' }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
              rows={3}
              placeholder={isLoggedIn ? 'اكتب تعليقك هنا...' : 'سجّل الدخول لتتمكن من إضافة تعليق'}
              className="w-full px-4 py-3 bg-white dark:bg-[#0a1628] rounded-xl border-2 border-transparent text-[#191c1d] dark:text-white placeholder:text-[#737782] focus:outline-none focus:border-[#DC2626]/40 transition-all duration-200 text-right resize-none"
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#737782]">
                {isLoggedIn ? `مرحباً ${user?.name}` : 'سجّل الدخول لمشاركة تعليقك'}
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-gradient-to-l from-[#DC2626] to-[#991B1B] hover:shadow-[0_8px_24px_rgba(220,38,38,0.25)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
              >
                {submitting ? 'جاري الإرسال...' : isLoggedIn ? 'إرسال التعليق' : 'تسجيل الدخول'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          {comments.map((c, i) => (
            <div key={c.id} className="gloss-card rounded-2xl p-5 transition-all duration-700" style={{ transitionDelay: `${(i % 5) * 70 + 200}ms` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-[#1E3A8A] to-[#312e81] shadow-lg shadow-[#1E3A8A]/25">
                  {c.name?.charAt(0) || 'ط'}
                </div>
                <div>
                  <p className="font-bold text-[#0f172a] dark:text-white text-sm">{c.name || 'طالب'}</p>
                  <span className="text-xs text-[#64748b] dark:text-slate-400">{c.role || 'طالب'}</span>
                </div>
              </div>
              <p className="text-[#334155] dark:text-slate-300 text-sm leading-relaxed">{c.text}</p>
            </div>
          ))}
          {!loading && comments.length === 0 && (
            <p className="text-center text-[#94a3b8] py-8">لا توجد تعليقات بعد، كن أول من يشارك رأيه!</p>
          )}
          {loading && (
            <div className="flex justify-center py-8">
              <span className="animate-spin w-6 h-6 border-2 border-[#DC2626] border-t-transparent rounded-full" aria-label="جارٍ التحميل" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomeComments;
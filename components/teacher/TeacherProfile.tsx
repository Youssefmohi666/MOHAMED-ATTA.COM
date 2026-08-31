import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const inputCls = "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm font-cairo outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-colors duration-150 box-border placeholder:text-slate-400";

const TeacherProfile: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="animate-fade-in max-w-2xl">
            <h2 className="text-lg font-extrabold text-[#0f2233] mb-4 font-cairo flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                الملف الشخصي
            </h2>

            {/* Avatar card */}
            <div className="flex items-center gap-4 mb-4 bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-lg hover:shadow-amber-500/5 transition-shadow duration-200">
                <div className="w-[72px] h-[72px] rounded-[18px] shrink-0 bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div>
                    <div className="text-lg font-extrabold text-[#0f2233] font-cairo">
                        {user?.name || 'المدرس'}
                    </div>
                    <div className="text-[13px] text-slate-500 mt-0.5 font-cairo">
                        مدرس معتمد
                    </div>
                    <button className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 text-amber-600 text-xs font-semibold cursor-pointer hover:bg-amber-100 transition-colors duration-200 font-cairo">
                        تغيير الصورة
                    </button>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                {[
                    { label: 'الاسم الكامل', value: user?.name || '', type: 'text', id: 'profile-name' },
                    { label: 'البريد الإلكتروني', value: user?.email || '', type: 'email', id: 'profile-email' },
                ].map(f => (
                    <div key={f.id}>
                        <label htmlFor={f.id} className="block text-xs font-bold text-slate-500 mb-1.5 font-cairo">
                            {f.label}
                        </label>
                        <input
                            id={f.id}
                            name={f.id}
                            defaultValue={f.value}
                            type={f.type}
                            className={inputCls}
                        />
                    </div>
                ))}
                <div>
                    <label htmlFor="profile-bio" className="block text-xs font-bold text-slate-500 mb-1.5 font-cairo">
                        نبذة عنك
                    </label>
                    <textarea
                        id="profile-bio"
                        name="profile-bio"
                        rows={3}
                        className={`${inputCls} resize-y`}
                    />
                </div>
                <button className="self-start flex items-center gap-1.5 bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-6 py-2.5 text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-amber-500/25 font-cairo">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="17 21 17 13 7 13 7 21" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="7 3 7 8 15 8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    حفظ التغييرات
                </button>
            </div>
        </div>
    );
};

export default TeacherProfile;
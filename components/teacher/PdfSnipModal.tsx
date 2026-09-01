import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    getPdfInfo, getPdfPageUrl, snipPdf,
} from '../../api/media.api';
import { useToast } from '../../contexts/ToastContext';

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#0f2233] outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition font-cairo placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50";

interface SnipModalProps {
    /** PDF media id to snip from. */
    pdfMediaId: string;
    onCancel: () => void;
    /** Called with the resulting imageUrl path to attach to a question. */
    onSnip: (imageUrl: string) => void;
}

const PdfSnipModal: React.FC<SnipModalProps> = ({ pdfMediaId, onCancel, onSnip }) => {
    const { showToast } = useToast();
    const [pageCount, setPageCount] = useState(1);
    const [page, setPage] = useState(1);
    const [imgUrl, setImgUrl] = useState('');
    const [imgLoading, setImgLoading] = useState(true);
    const [snipLoading, setSnipLoading] = useState(false);

    // Current selection geometry in image pixels.
    const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [ready, setReady] = useState(false);

    // Load metadata on mount.
    useEffect(() => {
        (async () => {
            try {
                const info = await getPdfInfo(pdfMediaId);
                setPageCount(Math.max(1, info.pageCount));
            } catch {
                showToast('تعذر قراءة ملف PDF', 'error');
            }
        })();
    }, [pdfMediaId, showToast]);

    // Refresh page image whenever the page changes.
    useEffect(() => {
        setImgLoading(true);
        setSel(null);
        setReady(false);
        setImgUrl(getPdfPageUrl(pdfMediaId, page));
    }, [pdfMediaId, page]);

    // Convert a pointer event to coordinates in the un-scaled rendered image.
    const toImagePoint = useCallback(
        (clientX: number, clientY: number): { x: number; y: number } | null => {
            const img = imgRef.current;
            const container = containerRef.current;
            if (!img || !container) return null;
            const rect = container.getBoundingClientRect();
            const scaleX = img.naturalWidth / rect.width;
            const scaleY = img.naturalHeight / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY,
            };
        },
        []
    );

    const onPointerDown = (e: React.PointerEvent) => {
        if (!ready) return;
        e.preventDefault();
        const p = toImagePoint(e.clientX, e.clientY);
        if (!p) return;
        dragStart.current = p;
        setDragging(true);
        setSel({ x: p.x, y: p.y, w: 0, h: 0 });
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragging || !dragStart.current) return;
        const p = toImagePoint(e.clientX, e.clientY);
        if (!p) return;
        const x = Math.min(dragStart.current.x, p.x);
        const y = Math.min(dragStart.current.y, p.y);
        setSel({ x, y, w: Math.abs(p.x - dragStart.current.x), h: Math.abs(p.y - dragStart.current.y) });
    };

    const onPointerUp = () => {
        setDragging(false);
        dragStart.current = null;
    };

    // Disable native image drag.
    useEffect(() => {
        const img = imgRef.current;
        if (img) {
            img.style.userSelect = 'none';
            img.style.pointerEvents = 'none';
        }
    }, [imgLoading, page]);

    const handleSnip = async () => {
        if (!sel || sel.w < 10 || sel.h < 10) {
            showToast('اسحب مربعاً على الصفحة لتحديد منطقة السؤال', 'error');
            return;
        }
        setSnipLoading(true);
        try {
            const result = await snipPdf(pdfMediaId, {
                page,
                x: Math.round(sel.x),
                y: Math.round(sel.y),
                width: Math.round(sel.w),
                height: Math.round(sel.h),
            });
            onSnip(result.imageUrl);
        } catch {
            showToast('تعذر قص المنطقة المحددة', 'error');
        }
        setSnipLoading(false);
    };

    const prevPage = () => setPage(p => Math.max(1, p - 1));
    const nextPage = () => setPage(p => Math.min(pageCount, p + 1));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget && !snipLoading) onCancel(); }}>
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-bold text-[#0f2233] font-cairo">قص سؤال من ملف PDF</h3>
                        <p className="text-[12px] text-slate-500 font-cairo mt-0.5">اسحب على الصفحة لتحديد منطقة السؤال ثم اضغط "قص الصورة".</p>
                    </div>
                    <button onClick={() => !snipLoading && onCancel()} className="text-slate-400 hover:text-[#0f2233] cursor-pointer bg-transparent border-none p-1">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                    </button>
                </div>

                {/* Page controls */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-cairo">الصفحة</span>
                        <button onClick={prevPage} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <span className="text-sm font-bold text-[#0f2233] font-cairo w-16 text-center">{page} / {pageCount}</span>
                        <button onClick={nextPage} disabled={page >= pageCount} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                    </div>
                    <button onClick={() => setSel(null)} disabled={!sel}
                        className="text-xs text-slate-500 hover:text-[#0f2233] cursor-pointer bg-transparent border-none font-cairo disabled:opacity-40">
                        مسح التحديد
                    </button>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-auto p-5 bg-slate-100">
                    <div ref={containerRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerUp}
                        className="relative max-w-full w-fit mx-auto cursor-crosshair touch-none"
                        style={{ userSelect: 'none' }}>
                        {imgLoading && (
                            <div className="w-64 h-80 flex items-center justify-center bg-white border border-slate-200 rounded-xl">
                                <div className="w-9 h-9 rounded-full border-[3px] border-amber-500/15 border-t-amber-500 animate-spin" />
                            </div>
                        )}
                        <img
                            ref={imgRef}
                            src={imgUrl}
                            alt={`صفحة ${page} من ملف PDF`}
                            onLoad={() => { setImgLoading(false); setReady(true); }}
                            className={["max-w-full rounded-xl shadow-lg", imgLoading ? 'hidden' : 'block'].join(' ')}
                            draggable={false}
                        />
                        {sel && ready && (
                            <div className="absolute border-2 border-amber-500 bg-amber-400/20"
                                style={{
                                    left: `${(sel.x / imgRef.current!.naturalWidth) * 100}%`,
                                    top: `${(sel.y / imgRef.current!.naturalHeight) * 100}%`,
                                    width: `${(sel.w / imgRef.current!.naturalWidth) * 100}%`,
                                    height: `${(sel.h / imgRef.current!.naturalHeight) * 100}%`,
                                }}>
                                {sel.w >= 10 && sel.h >= 10 && (
                                    <span className="absolute -top-6 right-0 text-[11px] font-cairo text-white bg-amber-500 px-2 py-0.5 rounded">
                                        {Math.round(sel.w)}×{Math.round(sel.h)} بكسل
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 px-5 py-4 border-t border-slate-100 justify-end">
                    <button onClick={() => !snipLoading && onCancel()}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors duration-200 cursor-pointer font-cairo">
                        إلغاء
                    </button>
                    <button onClick={handleSnip} disabled={snipLoading || !sel}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none text-white text-[13px] font-bold hover:opacity-90 transition-opacity duration-200 cursor-pointer font-cairo disabled:opacity-50 shadow-lg shadow-amber-500/20">
                        {snipLoading ? 'جاري القص...' : 'قص الصورة'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PdfSnipModal;
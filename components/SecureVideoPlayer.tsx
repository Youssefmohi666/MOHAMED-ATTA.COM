import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSignedStreamToken, getHlsUrl, getStreamUrl } from '../api/media.api';
import { updateProgress } from '../api/student.api';
import { getToken } from '../utils/token';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SecureVideoPlayerProps {
    lectureId: string;
    mediaFileId: string;
    userEmail?: string;
    userName?: string;
}

// ── Signed token fetcher ──────────────────────────────────────────────────────
async function fetchSignedToken(mediaFileId: string): Promise<string | null> {
    try {
        return await getSignedStreamToken(mediaFileId);
    } catch {
        return null;
    }
}

// ── Secure HLS Video Player ───────────────────────────────────────────────────
const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({ lectureId, mediaFileId, userEmail, userName }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<any | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    const watermarkText = userEmail || userName || '';

    // ── Initialize player: try HLS, fall back to direct stream ─────────────────
    const initPlayer = useCallback(async () => {
        if (!videoRef.current || !mediaFileId) return;
        setLoading(true);
        setError(null);

        const jwt = getToken();
        const streamUrl = getStreamUrl(mediaFileId);

        // Try HLS first
        const HlsModule = await import('hls.js');
        const Hls = HlsModule.default;
        if (Hls.isSupported()) {
            try {
                const token = await fetchSignedToken(mediaFileId);
                if (!token) throw new Error('No token');

                const playlistUrl = getHlsUrl(mediaFileId, token);
                // Probe the playlist — if it fails (no HLS files, 401, etc), fall back
                const probe = await fetch(playlistUrl, {
                    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
                });
                if (!probe.ok) throw new Error('HLS not available');

                const hls = new Hls({
                    xhrSetup: (xhr) => {
                        if (jwt) xhr.setRequestHeader('Authorization', `Bearer ${jwt}`);
                    },
                    enableWorker: true,
                    lowLatencyMode: false,
                    backBufferLength: 30,
                });

                hls.loadSource(playlistUrl);
                hls.attachMedia(videoRef.current);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setLoading(false);
                    videoRef.current?.play().catch(() => {});
                });

                hls.on(Hls.Events.ERROR, (_, data) => {
                    if (data.fatal) {
                        hls.destroy();
                        hlsRef.current = null;
                        // Fall back to direct stream
                        if (videoRef.current) {
                            videoRef.current.src = streamUrl;
                            setLoading(false);
                        }
                    }
                });

                hlsRef.current = hls;
                return;
            } catch {
                // HLS not available — fall through to direct stream
            }
        }

        // Fallback: direct stream via API
        if (videoRef.current) {
            videoRef.current.src = streamUrl;
            setLoading(false);
        }
    }, [mediaFileId]);

    useEffect(() => {
        initPlayer();
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [initPlayer]);

    // ── Track progress and sync to server ──────────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        let lastSync = 0;

        const onTime = () => {
            if (!video.duration) return;
            const pct = Math.round((video.currentTime / video.duration) * 100);
            setProgress(pct);

            // Sync to server every 10 seconds
            const now = Date.now();
            if (now - lastSync > 10000) {
                lastSync = now;
                updateProgress({ lectureId, completed: pct >= 90, progressPct: pct }).catch(() => {});
            }
        };

        const onEnded = () => {
            setProgress(100);
            updateProgress({ lectureId, completed: true, progressPct: 100 }).catch(() => {});
        };

        video.addEventListener('timeupdate', onTime);
        video.addEventListener('ended', onEnded);
        return () => {
            video.removeEventListener('timeupdate', onTime);
            video.removeEventListener('ended', onEnded);
        };
    }, [mediaFileId]);

    // ── Fullscreen: request on container so overlays stay visible ────────────
    const handleFullscreenRequest = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        if (!document.fullscreenElement) {
            container.requestFullscreen?.().catch(() => {});
        } else {
            document.exitFullscreen?.().catch(() => {});
        }
    }, []);

    // Intercept the native fullscreen button on the <video> and redirect to container
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onFullscreenChange = () => {
            // If the video itself went fullscreen (not our container), exit and re-enter on container
            if (document.fullscreenElement === video) {
                document.exitFullscreen().then(() => {
                    containerRef.current?.requestFullscreen?.().catch(() => {});
                }).catch(() => {});
            }
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // ── Disable right-click ───────────────────────────────────────────────────
    const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

    // ── Block keyboard shortcuts ──────────────────────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 's'].includes(e.key.toLowerCase())) ||
            (e.ctrlKey && ['u', 's', 'p'].includes(e.key.toLowerCase()))
        ) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    return (
        <div
            ref={containerRef}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            id="secure-player-container"
            style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}
            tabIndex={0}
        >
            {/* Fullscreen: make video fill container when container is fullscreen */}
            <style>{`
                #secure-player-container:-webkit-full-screen { width: 100vw; height: 100vh; }
                #secure-player-container:-moz-full-screen { width: 100vw; height: 100vh; }
                #secure-player-container:fullscreen { width: 100vw; height: 100vh; }
                #secure-player-container:fullscreen video { width: 100%; height: 100%; object-fit: contain; }
            `}</style>

            {/* ── Video element (source is set by hls.js, not in DOM) ── */}
            <video
                ref={videoRef}
                controls
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={handleContextMenu}
                style={{ width: '100%', height: '100%', display: 'block' }}
                playsInline
            />

            {/* ── Loading overlay ── */}
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 5,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: '12px'
                }}>
                    <div style={{
                        width: 40, height: 40, border: '3px solid rgba(56,189,248,0.2)',
                        borderTopColor: '#38bdf8', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    <span style={{ color: '#94a3b8', fontSize: '13px', fontFamily: "'Cairo', sans-serif" }}>
                        جاري تحميل الفيديو...
                    </span>
                </div>
            )}

            {/* ── Error overlay ── */}
            {error && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 5,
                    background: 'rgba(0,0,0,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: '12px'
                }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                    </svg>
                    <span style={{ color: '#e2e8f0', fontSize: '14px', fontFamily: "'Cairo', sans-serif" }}>{error}</span>
                    <button
                        onClick={initPlayer}
                        style={{
                            padding: '8px 20px', borderRadius: '8px',
                            background: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
                            color: '#fff', border: 'none', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 600, fontFamily: "'Cairo', sans-serif"
                        }}
                    >
                        إعادة المحاولة
                    </button>
                </div>
            )}

            {/* ── Dynamic watermark ── */}
            {watermarkText && (
                <DynamicWatermark email={watermarkText} progress={progress} />
            )}

            {/* ── Block right-click overlay (covers video) ── */}
            <div
                onContextMenu={handleContextMenu}
                style={{
                    position: 'absolute', inset: 0, zIndex: 15,
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
};

// ── Dynamic watermark: a single line that moves to random positions ────────────
const DynamicWatermark: React.FC<{ email: string; progress: number }> = ({ email }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pos, setPos] = useState<{ x: number; y: number }>({ x: 8, y: 8 });

    useEffect(() => {
        const interval = setInterval(() => {
            setPos({
                x: Math.random() * 75 + 5,
                y: Math.random() * 75 + 5,
            });
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        const angle = -Math.PI / 6;
        ctx.translate((pos.x / 100) * canvas.width, (pos.y / 100) * canvas.height);
        ctx.rotate(angle);
        ctx.fillText(email, 0, 0);
        ctx.restore();
    }, [email, pos]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
                position: 'absolute', inset: 0, zIndex: 20,
                width: '100%', height: '100%',
                pointerEvents: 'none',
            }}
        />
    );
};

export default SecureVideoPlayer;

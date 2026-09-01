import { apiRequest } from "./client";
import { API_BASE } from "../config/api.config";
import { getToken } from "../utils/token";

export interface MediaFile {
  id: string;
  originalFileName: string;
  storedFileName: string;
  fileType: "video" | "document" | "other";
  compressionType: "none" | "video_transcoded" | "gzipped";
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration?: number;
  width?: number;
  height?: number;
  subjectId?: string;
  lectureId?: string;
  createdAt: string;
  /** True once background HLS transcoding is complete for this video. */
  hlsReady?: boolean;
}

export function getMediaByLecture(lectureId: string): Promise<{ data: MediaFile[] }> {
  return apiRequest(`/media/lecture/${lectureId}`);
}

export function getMediaBySubject(subjectId: string): Promise<{ data: MediaFile[] }> {
  return apiRequest(`/media/subject/${subjectId}`);
}

export function getMediaFile(id: string): Promise<{ data: MediaFile }> {
  return apiRequest(`/media/${id}`);
}

/** Returns an authenticated URL for streaming video (adds token as query param for <video> src) */
export function getStreamUrl(id: string): string {
  const token = getToken();
  return `${API_BASE}/media/stream/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

/** Fetches a short-lived signed token for HLS playback (valid 5 min). */
export async function getSignedStreamToken(mediaFileId: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/media/${mediaFileId}/token`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to get stream token (${res.status})`);
  const json = await res.json();
  return json.token as string;
}

/** Returns the HLS m3u8 URL with a signed token embedded. */
export function getHlsUrl(mediaFileId: string, signedToken: string): string {
  return `${API_BASE}/media/hls/${mediaFileId}/index.m3u8?st=${encodeURIComponent(signedToken)}`;
}

/** Returns an authenticated URL for viewing/downloading a document */
export function getViewUrl(id: string): string {
  const token = getToken();
  return `${API_BASE}/media/view/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export function getDownloadUrl(id: string): string {
  const token = getToken();
  return `${API_BASE}/media/download/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface StreamOptions {
  onProgress?: (loaded: number, total: number) => void;
  onError?: (error: Error) => void;
}

/** Upload a video file for a lecture. Returns the created MediaFile. */
export async function uploadMediaFile(
  file: File,
  lectureId?: string,
  onProgress?: (pct: number) => void
): Promise<MediaFile> {
  return _uploadFile(file, 'video', lectureId, onProgress);
}

/** Upload a document/material file for a lecture. Returns the created MediaFile. */
export async function uploadDocumentFile(
  file: File,
  lectureId?: string,
  onProgress?: (pct: number) => void
): Promise<MediaFile> {
  return _uploadFile(file, 'document', lectureId, onProgress);
}

/**
 * How long (ms) to wait for the server to respond *after* the file bytes
 * have been fully transmitted.  Large files can take a while to be saved /
 * transcoded on the server side, so we give it 5 minutes.  The upload
 * progress phase itself is not affected by this timeout.
 */
const SERVER_RESPONSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function _uploadFile(
  file: File,
  fileType: 'video' | 'document',
  lectureId?: string,
  onProgress?: (pct: number) => void
): Promise<MediaFile> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  if (lectureId) formData.append("lectureId", lectureId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/media/upload?fileType=${fileType}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    // Start a response-timeout timer once the upload bytes are fully sent.
    // This prevents the request from hanging indefinitely when the server is
    // slow to respond after receiving a large file.
    let responseTimer: ReturnType<typeof setTimeout> | null = null;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
        // When all bytes are sent, start the server-response timeout.
        // We do this here rather than in xhr.upload.onload because
        // onload is unreliable in some browsers/environments and may
        // never fire, leaving the request hanging silently at 100%.
        if (pct === 100 && !responseTimer) {
          responseTimer = setTimeout(() => {
            xhr.abort();
            reject(new Error("انتهت مهلة الاستجابة من الخادم. يرجى المحاولة مرة أخرى."));
          }, SERVER_RESPONSE_TIMEOUT_MS);
        }
      }
    };

    // Also set the timer in onload as a fallback for cases where
    // the final progress event fires before onload.
    xhr.upload.onload = () => {
      if (!responseTimer) {
        onProgress?.(100);
        responseTimer = setTimeout(() => {
          xhr.abort();
          reject(new Error("انتهت مهلة الاستجابة من الخادم. يرجى المحاولة مرة أخرى."));
        }, SERVER_RESPONSE_TIMEOUT_MS);
      }
    };

    xhr.onload = () => {
      if (responseTimer) clearTimeout(responseTimer);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve((json.data?.mediaFile ?? json.mediaFile ?? json.data ?? json) as MediaFile);
        } catch {
          reject(new Error("استجابة غير صالحة من الخادم"));
        }
      } else {
        reject(new Error(`فشل الرفع (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      if (responseTimer) clearTimeout(responseTimer);
      reject(new Error("خطأ في الشبكة أثناء الرفع"));
    };

    xhr.onabort = () => {
      if (responseTimer) clearTimeout(responseTimer);
      reject(new Error("تم إلغاء الرفع"));
    };

    xhr.send(formData);
  });
}

/**
 * Upload multiple files in parallel (up to `concurrency` at a time).
 * Each file gets its own progress callback: onProgress(index, pct).
 * Returns results in the same order as the input files array.
 * Failed uploads are returned as Error objects rather than throwing, so
 * successful uploads are not lost.
 */
export async function uploadFilesParallel(
  files: Array<{ file: File; fileType: 'video' | 'document'; lectureId?: string }>,
  onProgress?: (index: number, pct: number) => void,
  concurrency = 3
): Promise<Array<MediaFile | Error>> {
  const results: Array<MediaFile | Error> = new Array(files.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < files.length) {
      const i = nextIndex++;
      const { file, fileType, lectureId } = files[i];
      try {
        results[i] = await _uploadFile(file, fileType, lectureId, (pct) => onProgress?.(i, pct));
      } catch (err) {
        results[i] = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  // Spin up `concurrency` workers that each pull from the shared queue
  const workers = Array.from({ length: Math.min(concurrency, files.length) }, runWorker);
  await Promise.all(workers);
  return results;
}

/**
 * Polls the backend until HLS transcoding is complete for a video.
 * Calls onReady() when hlsReady becomes true.
 * Silently stops after maxAttempts (default ~2 min).
 */
export function waitForHlsReady(
  mediaFileId: string,
  onReady: () => void,
  intervalMs = 5000,
  maxAttempts = 24
): void {
  let attempts = 0;
  const check = async () => {
    attempts++;
    try {
      const res = await getMediaFile(mediaFileId);
      if (res.data?.hlsReady) {
        onReady();
        return;
      }
    } catch {
      // network hiccup — keep polling
    }
    if (attempts < maxAttempts) {
      setTimeout(check, intervalMs);
    }
  };
  setTimeout(check, intervalMs);
}

/**
 * Upload multiple document files in a single batch request.
 * Falls back to sequential single uploads if the batch endpoint fails.
 */
export async function uploadDocumentsBatch(
  files: File[],
  lectureId?: string
): Promise<MediaFile[]> {
  const token = getToken();
  const formData = new FormData();
  files.forEach(f => formData.append("files", f));
  if (lectureId) formData.append("lectureId", lectureId);

  const res = await fetch(`${API_BASE}/media/upload/batch`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) throw new Error(`Batch upload failed (${res.status})`);
  const json = await res.json();
  // Backend returns ApiResponse<List<MediaUploadResultDto>>
  const results: Array<{ success: boolean; mediaFile?: MediaFile }> = json.data ?? json;
  return results.filter(r => r.success && r.mediaFile).map(r => r.mediaFile!);
}

export async function getStreamWithProgress(
  id: string,
  options?: StreamOptions
): Promise<Blob> {
  const token = getToken();
  const url = `${API_BASE}/media/stream/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Stream failed: ${response.statusText}`);

  const total = parseInt(response.headers.get("content-length") || "0", 10);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      options?.onProgress?.(loaded, total);
    }
  } catch (error) {
    options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return new Blob(chunks);
}

// ── Question image helpers ────────────────────────────────────────

/** Build a full URL that includes ?token= so <img> tags work for auth-gated images. */
export function authedImageUrl(urlOrPath: string): string {
  const token = getToken();
  const full = urlOrPath.startsWith("http")
    ? urlOrPath
    : urlOrPath.startsWith("/")
    ? `${API_BASE}${urlOrPath}`
    : `${API_BASE}/media/image/${urlOrPath}`;
  return `${full}${full.includes("?") ? "&" : "?"}token=${encodeURIComponent(token || "")}`;
}

/** Upload an image file (PNG/JPEG/etc.) returning the created MediaFile. */
export async function uploadQuestionImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<MediaFile> {
  return _uploadFile(file, "document", undefined, onProgress);
}

// ── PDF snipping helpers ──────────────────────────────────────────

export interface PdfInfo {
  pageCount: number;
}

/** Returns metadata (page count) for a PDF stored in media. */
export function getPdfInfo(pdfMediaId: string): Promise<PdfInfo> {
  return apiRequest(`/media/pdf/${pdfMediaId}/info`).then(
    (j) => j.data as PdfInfo
  );
}

/** Returns the authenticated URL to render a single PDF page as PNG (150 DPI).
 *  Use this as <img src={...}> inside teacher's PDF snip viewer. */
export function getPdfPageUrl(pdfMediaId: string, page: number): string {
  const token = getToken();
  return `${API_BASE}/media/pdf/${pdfMediaId}/page/${page}?token=${encodeURIComponent(token || "")}`;
}

export interface SnipResult {
  mediaFileId: string;
  imageUrl: string;
}

/** Crops a rectangular region of a PDF page and returns a new image media file. */
export function snipPdf(
  pdfMediaId: string,
  data: { page: number; x: number; y: number; width: number; height: number }
): Promise<SnipResult> {
  return apiRequest(`/media/pdf/${pdfMediaId}/snip`, {
    method: "POST",
    body: JSON.stringify(data),
  }).then((j) => j.data as SnipResult);
}

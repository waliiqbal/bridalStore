import { apiFetch } from "@/infrastructure/http/api-client";

// Matches the backend limits (uploads module)
export const MAX_IMAGE_MB = 15;
export const MAX_FILES_PER_REQUEST = 10;

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

// Checks the files in the browser first so the owner gets a quick, clear message
export function checkImageFiles(files: File[]): string | null {
  for (const file of files) {
    if (!file.type.startsWith("image/")) return `"${file.name}" is not a picture.`;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      return `"${file.name}" is bigger than ${MAX_IMAGE_MB} MB.`;
    }
  }
  return null;
}

// Uploads any number of pictures (sent in batches the server accepts).
// Results come back in the same order as the files.
export async function uploadImages(files: File[]): Promise<UploadedImage[]> {
  const uploaded: UploadedImage[] = [];
  for (let i = 0; i < files.length; i += MAX_FILES_PER_REQUEST) {
    const form = new FormData();
    for (const file of files.slice(i, i + MAX_FILES_PER_REQUEST)) form.append("files", file);
    uploaded.push(...(await apiFetch<UploadedImage[]>("/admin/uploads", { method: "POST", body: form })));
  }
  return uploaded;
}

// Matches the backend limit for videos
export const MAX_VIDEO_MB = 50;

export function checkVideoFile(file: File): string | null {
  if (file.type !== "video/mp4" && file.type !== "video/webm") {
    return `"${file.name}" is not an MP4 video. If it is a .mov from an iPhone, please save it as MP4 first.`;
  }
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    return `"${file.name}" is bigger than ${MAX_VIDEO_MB} MB. Please shorten or compress it.`;
  }
  return null;
}

export async function uploadVideo(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<{ url: string }>("/admin/uploads/video", { method: "POST", body: form });
}

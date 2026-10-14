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

import { fromBuffer } from 'file-type';

const ALLOWED_RESUME_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_RESUME_EXT = new Set(['pdf', 'docx']);

export interface ResumeValidationResult {
  ok: boolean;
  mime?: string;
  ext?: string;
  error?: string;
}

/**
 * Validate a resume upload by inspecting the actual file content (magic bytes),
 * not just the client-supplied MIME header. Returns the detected MIME and
 * a normalized file extension if the content matches an allowed type.
 */
export async function validateResumeContent(buffer: Buffer): Promise<ResumeValidationResult> {
  if (!buffer || buffer.length === 0) {
    return { ok: false, error: 'Resume file is empty' };
  }

  let detected: { ext: string; mime: string } | undefined;
  try {
    detected = await fromBuffer(buffer);
  } catch {
    detected = undefined;
  }

  if (!detected) {
    return { ok: false, error: 'Could not verify file type' };
  }

  if (!ALLOWED_RESUME_MIME.has(detected.mime)) {
    return { ok: false, error: 'Unsupported file format. Only PDF (.pdf) and Word documents (.docx) are accepted.' };
  }

  return {
    ok: true,
    mime: detected.mime,
    ext: ALLOWED_RESUME_EXT.has(detected.ext) ? detected.ext : 'pdf',
  };
}

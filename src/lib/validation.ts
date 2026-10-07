import { AttachmentInput } from '../types/jarvis';
import { ErrorCategory, JarvisError } from './errors';

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_ATTACHMENTS_PER_TURN = 4;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  category?: ErrorCategory;
}

/**
 * Valida um anexo individual para garantir conformidade estrita de segurança e tamanho.
 */
export function validateSingleAttachment(attachment: AttachmentInput): ValidationResult {
  if (!attachment) {
    return { valid: false, error: 'Anexo vazio ou indefinido.', category: ErrorCategory.VALIDATION_ERROR };
  }

  if (!attachment.mimeType || !ALLOWED_MIME_TYPES.includes(attachment.mimeType as any)) {
    return {
      valid: false,
      error: `Formato de arquivo não suportado (${attachment.mimeType || 'desconhecido'}). Formatos permitidos: PNG, JPEG, WEBP e PDF.`,
      category: ErrorCategory.VALIDATION_ERROR,
    };
  }

  if (!attachment.base64Data || typeof attachment.base64Data !== 'string') {
    return {
      valid: false,
      error: 'Conteúdo binário do anexo ausente ou inválido.',
      category: ErrorCategory.VALIDATION_ERROR,
    };
  }

  // Estimar tamanho a partir do Base64: tamanho ~= (comprimento / 4) * 3
  const rawBase64 = attachment.base64Data.replace(/^data:[^;]+;base64,/, '');
  const estimatedSize = Math.ceil((rawBase64.length * 3) / 4);

  if (estimatedSize > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (estimatedSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Arquivo "${attachment.name || 'anexo'}" muito grande (${sizeMb} MB). O limite máximo por arquivo é de 10 MB.`,
      category: ErrorCategory.VALIDATION_ERROR,
    };
  }

  return { valid: true };
}

/**
 * Valida uma lista completa de anexos.
 */
export function validateAttachments(attachments?: AttachmentInput[] | null): ValidationResult {
  if (!attachments || attachments.length === 0) {
    return { valid: true };
  }

  if (attachments.length > MAX_ATTACHMENTS_PER_TURN) {
    return {
      valid: false,
      error: `Número máximo de ${MAX_ATTACHMENTS_PER_TURN} arquivos excedido nesta mensagem. Foram enviados ${attachments.length}.`,
      category: ErrorCategory.VALIDATION_ERROR,
    };
  }

  for (const att of attachments) {
    const res = validateSingleAttachment(att);
    if (!res.valid) {
      return res;
    }
  }

  return { valid: true };
}

/**
 * Lança JarvisError se os anexos forem inválidos
 */
export function assertValidAttachments(attachments?: AttachmentInput[] | null): void {
  const result = validateAttachments(attachments);
  if (!result.valid) {
    throw new JarvisError(
      result.category || ErrorCategory.VALIDATION_ERROR,
      result.error || 'Anexo inválido.',
      400
    );
  }
}

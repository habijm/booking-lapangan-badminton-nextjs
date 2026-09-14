export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(/[^\d+\-\s()]/g, '').trim();
}

export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = input.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    return '';
  }

  return trimmed;
}

export function sanitizeOrderId(orderId: string): string {
  if (!orderId || typeof orderId !== 'string') {
    return '';
  }

  return orderId.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 64);
}

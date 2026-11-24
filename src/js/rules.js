// Field rules shared by the browser forms and the Worker (which repeats every one). Pure.

export const LIMITS = { name: 120, organization: 160, email: 200, phone: 40, notes: 4000, details: 4000, width: 40, height: 40, heard: 200, number: 60 };
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const FILE_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', pdf: 'application/pdf',
  webp: 'image/webp', ai: 'application/illustrator', eps: 'application/postscript',
};

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export const CHECKS = {
  name: (v) => str(v).length >= 1 && str(v).length <= LIMITS.name,
  email: (v) => str(v).length <= LIMITS.email && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(str(v)),
  zip: (v) => /^\d{5}$/.test(str(v)),
  details: (v) => str(v).length >= 1 && str(v).length <= LIMITS.details,
  number: (v) => str(v).length >= 1 && str(v).length <= LIMITS.number,
};

// Which fields each form requires; the message keys match messages.json -> errors.
export const REQUIRED = {
  quote: ['name', 'email', 'details', 'zip'],
  drawing: ['name', 'email', 'zip'],
  reserve: ['name', 'email', 'zip'],
  'email-design': ['email'],
  invoice: ['number', 'email'],
};

export const NEED = ['monument', 'several', 'more', 'other'];
export const CONTACT = ['email', 'phone'];
export const INSTALL = ['yes', 'no', 'unsure', ''];
export const WHEN = ['none', 'three-months', 'date', ''];

// Returns the list of field names that fail, in form order.
export function invalidFields(form, data) {
  return (REQUIRED[form] || []).filter((f) => !CHECKS[f](data[f]));
}

export function fileExtension(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}

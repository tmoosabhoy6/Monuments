// The emails of SPEC §7.11.
import { tokens, config } from './validate.js';
import { quote, money } from '../../src/js/builder/pricing.js';
import { describe, sizeWords } from '../../src/js/builder/draw.js';
import { designUrl } from '../../src/js/builder/share.js';

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';

export function designSummary(design, base) {
  if (!design) return '';
  const q = quote(design, config);
  const size = config.pricing.sizes.find((s) => s.id === design.size);
  const lines = [
    describe(design, config),
    `Size of the sign face: ${sizeWords(size).replace(/ /g, ' ')}`,
    `Sides: ${design.sides === 2 ? 'Double-sided' : 'Single-sided'}`,
    `Installation: ${design.install ? 'Installed by a certified installer' : 'Delivered only'}`,
    design.paintCode ? `Paint code: ${design.paintCode}` : '',
    design.lighting ? 'Quote lighting for this sign: yes' : '',
    ...q.lines.map((l) => `${l.label}: ${l.amount === null ? 'Priced with your drawing' : money(l.amount)}`),
    `Total: ${q.priced ? money(q.total) : 'Priced with your drawing'}`,
    `Link: ${designUrl(base + '/design/', design)}`,
  ];
  return lines.filter(Boolean).join('\n');
}

const LABELS = { name: 'Your name', organization: 'Organization', email: 'Email', phone: 'Phone', contact: 'Best way to reach you',
  need: 'How many signs?', sides: 'Single-sided or double-sided?', details: 'What should the sign say?', width: 'Approximate width', height: 'Approximate height', zip: 'ZIP code where it will stand',
  install: 'Do you need installation?', when: 'When do you need it?', date: 'By a date', heard: 'How did you hear about us?', notes: 'Anything we should know?' };

export function toBusiness({ kind, name, reference, fields, design, fileLinks, base }) {
  const title = { quote: 'quote request', drawing: 'drawing request', deposit: 'deposit' }[kind];
  const body = [
    `Reference: ${reference}`,
    ...Object.entries(fields).filter(([, v]) => v !== '' && v !== null && v !== undefined).map(([k, v]) => `${LABELS[k] || k}: ${v}`),
    design ? `\nDesign\n${designSummary(design, base)}` : '',
    fileLinks.length ? `\nFiles (links work for 30 days)\n${fileLinks.map((f) => `${f.name}: ${f.url}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
  return { subject: `New ${title}: ${name}, ${reference}`, text: body };
}

export const quoteReceived = ({ name, reference }) => ({
  subject: 'We have your quote request',
  text: `Thank you, ${firstName(name)}. We have your request and will reply within ${tokens.response_time}. Your reference is ${reference}. If you need to add anything, reply to this email.`,
});

export const drawingReceived = ({ name, reference, link }) => ({
  subject: 'Your approval drawing is on its way',
  text: `Thank you, ${firstName(name)}. We are drawing your sign to scale and will email it within ${tokens.drawing_turnaround}. Here is the design you sent us: ${link}. Your reference is ${reference}.`,
});

export const depositPaid = ({ name, reference, amount }) => ({
  subject: 'Reserved: your monument sign',
  text: `Thank you, ${firstName(name)}. Your deposit of ${money(amount)} is paid and your place in production is reserved. Next we prepare your approval drawing. Nothing is built until you approve it. Your reference is ${reference}.`,
});

export const designEmail = ({ link }) => ({
  subject: 'Your monument sign design',
  text: `Here is the sign you designed: ${link}. The link opens this exact sign with its options and price.`,
});

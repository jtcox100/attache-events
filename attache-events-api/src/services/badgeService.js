const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const LABELS = [
  { x: 17, y: 72 }, { x: 305, y: 72 },
  { x: 17, y: 288 }, { x: 305, y: 288 },
  { x: 17, y: 504 }, { x: 305, y: 504 },
];
const LABEL_W = 289, LABEL_H = 217, PAD = 18, QR_SIZE = 90;
const LOGO_RENDER_W = 179;
const DEFAULT_LOGO = path.join(__dirname, '../../assets/showcase-logo.png');
const DEFAULT_LOGO_ASPECT = 1042 / 2648;

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function generateBadgePDF(attendees, event = {}, singleBadge = false) {
  return new Promise(async (resolve, reject) => {
    try {
      let logoBuffer = null;
      let logoAspect = DEFAULT_LOGO_ASPECT;

      if (event.badge_logo_url) {
        try {
          logoBuffer = await fetchImage(event.badge_logo_url);
          if (event.badge_logo_width && event.badge_logo_height) logoAspect = event.badge_logo_height / event.badge_logo_width;
        } catch (e) { console.error('Failed to fetch event logo:', e.message); }
      }

      if (!logoBuffer && fs.existsSync(DEFAULT_LOGO)) {
        logoBuffer = fs.readFileSync(DEFAULT_LOGO);
        logoAspect = 1042 / 2648;
      }

      const LOGO_H = Math.round(LOGO_RENDER_W * logoAspect);
      const chunks = [];
      const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: true });
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // attendees may be a sparse array with nulls for empty slots (single badge printing)
      // In that case, use the index directly as the label position
      const isSparse = attendees.some(a => a === null || a === undefined);
      if (isSparse) {
        // Sparse array — use index as label position, skip nulls
        for (let i = 0; i < Math.min(attendees.length, 6); i++) {
          if (!attendees[i]) continue;
          await drawBadge(doc, attendees[i], LABELS[i].x, LABELS[i].y, logoBuffer, LOGO_H);
        }
      } else {
        // Normal full batch — pack badges sequentially
        let li = 0;
        for (let i = 0; i < attendees.length; i++) {
          if (li === 6) { doc.addPage({ size: 'LETTER', margin: 0 }); li = 0; }
          await drawBadge(doc, attendees[i], LABELS[li].x, LABELS[li].y, logoBuffer, LOGO_H);
          li++;
        }
      }
      doc.end();
    } catch (err) { reject(err); }
  });
}

async function drawBadge(doc, attendee, x, y, logoBuffer, LOGO_H) {
  const logoY = y + LABEL_H - PAD - LOGO_H;
  const textX = x + PAD;
  const textW = LABEL_W - PAD * 2 - QR_SIZE - 8;

  const qrDataUrl = await QRCode.toDataURL(attendee.qr_code, { width: QR_SIZE, margin: 1 });
  doc.image(Buffer.from(qrDataUrl.split(',')[1], 'base64'), x + LABEL_W - PAD - QR_SIZE, y + PAD, { width: QR_SIZE, height: QR_SIZE });

  const parts = attendee.name.trim().split(' ');
  const firstName = parts.slice(0, -1).join(' ') || attendee.name;
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  let curY = y + PAD;
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000');
  doc.text(firstName, textX, curY, { width: textW, lineBreak: false }); curY += 23;
  if (lastName) { doc.text(lastName, textX, curY, { width: textW, lineBreak: false }); curY += 23; }

  // Dynamic font sizing based on text length
  const titleLen = (attendee.title || '').length;
  const companyLen = (attendee.company || '').length;
  const titleFontSize = titleLen > 40 ? 8 : titleLen > 28 ? 9 : 11;
  const companyFontSize = companyLen > 45 ? 8 : companyLen > 32 ? 10 : 12;
  const titleLineHeight = titleFontSize <= 9 ? 12 : 15;
  const companyLines = companyLen > 32 ? true : false; // allow wrap for long names

  if (attendee.title) {
    doc.font('Helvetica').fontSize(titleFontSize).fillColor('#444444');
    doc.text(attendee.title, textX, curY + 2, { width: textW, lineBreak: false });
    curY += titleLineHeight;
  }
  if (attendee.company) {
    doc.font('Helvetica').fontSize(companyFontSize).fillColor('#000000');
    doc.text(attendee.company, textX, curY + 2, { width: textW, lineBreak: companyLines });
  }

  if (logoBuffer) doc.image(logoBuffer, textX, logoY, { width: LOGO_RENDER_W, height: LOGO_H });
  doc.fillColor('#000000');
}

module.exports = { generateBadgePDF };

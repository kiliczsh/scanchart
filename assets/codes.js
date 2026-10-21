// The charts' contents. Payloads use digits and uppercase letters only (no I) where possible, so they read the same
// on US and Turkish-Q keyboard layouts; matching runs on the US-keycode reconstruction in app.js.
window.SC = window.SC || {};

SC.TYPES = [
  { g: '1D', id: 'ST01', name: 'Code 128',          bcid: 'code128',  text: 'ST01C128' },
  { g: '1D', id: 'ST02', name: 'Code 39',           bcid: 'code39',   text: 'ST02C39' },
  { g: '1D', id: 'ST03', name: 'Code 93',           bcid: 'code93',   text: 'ST03C93' },
  { g: '1D', id: 'EAN13', name: 'EAN-13',           bcid: 'ean13',    text: '8690000000012', match: s => s.includes('8690000000012') },
  { g: '1D', id: 'EAN8', name: 'EAN-8',             bcid: 'ean8',     text: '96385074',      match: s => s.includes('96385074') },
  { g: '1D', id: 'UPCA', name: 'UPC-A',             bcid: 'upca',     text: '036000291452',  match: s => s.includes('36000291452') },
  { g: '1D', id: 'UPCE', name: 'UPC-E',             bcid: 'upce',     text: '0123456',       match: s => /^0?123456\d?$/.test(s) },
  { g: '1D', id: 'ITF', name: 'Interleaved 2 of 5', bcid: 'interleaved2of5', text: '8070605040', match: s => s.includes('8070605040') },
  { g: '1D', id: 'CBAR', name: 'Codabar',           bcid: 'rationalizedCodabar', text: 'A40156B', match: s => s.includes('40156') },
  { g: '1D', id: 'MSI', name: 'MSI Plessey',        bcid: 'msi',      text: '5550123',       match: s => s.includes('555012') },
  { g: '1D', id: 'DBAR', name: 'GS1 DataBar',       bcid: 'databaromni', text: '(01)24012345678905', match: s => s.includes('2401234567890') },
  { g: '1D', id: 'GS128', name: 'GS1-128',          bcid: 'gs1-128',  text: '(01)08699999000010(10)AB12', match: s => s.includes('0869999900001') },
  { g: '2D', id: 'ST11', name: 'QR Code',           bcid: 'qrcode',      text: 'ST11QR' },
  { g: '2D', id: 'ST12', name: 'Micro QR',          bcid: 'microqrcode', text: 'ST12' },
  { g: '2D', id: 'ST13', name: 'Data Matrix',       bcid: 'datamatrix',  text: 'ST13DM' },
  { g: '2D', id: 'ST14', name: 'PDF417',            bcid: 'pdf417',      text: 'ST14PDF417', opts: { columns: 3 } },
  { g: '2D', id: 'ST15', name: 'MicroPDF417',       bcid: 'micropdf417', text: 'ST15MPDF' },
  { g: '2D', id: 'ST16', name: 'Aztec',             bcid: 'azteccode',   text: 'ST16AZTEC' },
  { g: '2D', id: 'ST17', name: 'MaxiCode',          bcid: 'maxicode',    text: 'ST17MAXC', opts: { mode: 4 } },
  { g: '2D', id: 'ST18', name: 'Han Xin',           bcid: 'hanxin',      text: 'ST18HANXN' },
  { g: '2D', id: 'ST19', name: 'DotCode',           bcid: 'dotcode',     text: 'ST19DOT' },
  { g: '2D', id: 'ST20', name: 'GS1 DataMatrix',    bcid: 'gs1datamatrix', text: '(01)08699999000027(21)ST20', match: s => s.includes('0869999900002') },
  { g: 'Özel', id: 'ST31', name: 'QR, ters renk',    bcid: 'qrcode', text: 'ST31NV', inverse: true },
  { g: 'Özel', id: 'ST32', name: 'QR, 0,25 mm modül', bcid: 'qrcode', text: 'ST32SMALL', moduleMm: 0.25 },
  { g: 'Özel', id: 'ST33', name: 'Klavye düzeni (US)', bcid: 'code128', text: 'ST33-aZ_.,;:/@[]', match: s => s.startsWith('ST33'), exact: true },
  { g: 'Özel', id: 'ST36', name: 'Klavye düzeni (Türkçe Q)', bcid: 'code128', text: 'ST36-iI.,;:/@_', match: s => s.startsWith('ST36'), exact: true },
  { g: 'Özel', id: 'ST34', name: 'QR, Türkçe karakter', bcid: 'qrcode', text: 'ST34 ÇĞİÖŞÜ çğıöşü', match: s => s.startsWith('ST34') },
  { g: 'Özel', id: 'ST35', name: 'QR, 304 karakter',  bcid: 'qrcode', text: 'ST35' + '0123456789'.repeat(30), match: s => s.startsWith('ST35') },
];

// Acuity rows, largest first, like the lines of an eye chart. Module sizes in millimetres.
// Each code sits in its own cut box with the full quiet zone, so the largest QR row is 1.6 mm to fit A4.
SC.QR_ROWS = [1.6, 1.25, 1, 0.8, 0.63, 0.5, 0.4, 0.33, 0.25];
SC.DM_ROWS = [3, 2.5, 2, 1.6, 1.25, 1, 0.8, 0.63, 0.5, 0.4, 0.33, 0.25];
SC.qrPayload = row => `SCQ${String(row).padStart(2, '0')}`;          // QR version 1 (21×21)
SC.dmPayload = row => `90${String(row).padStart(2, '0')}`;           // Data Matrix 10×10

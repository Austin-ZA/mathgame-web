const PDFDocument = require('pdfkit');
const fs = require('fs');

const outDir = 'tmp';
const outFile = `${outDir}/sample_report.pdf`;
fs.mkdirSync(outDir, { recursive: true });

const doc = new PDFDocument({ margin: 36, size: 'A4' });
const stream = fs.createWriteStream(outFile);
doc.pipe(stream);

doc.fontSize(18).text('Sample Sessions Report', { underline: true });
doc.moveDown(0.5);
doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
doc.moveDown(0.75);

const cols = ['Session','User','Mode','Level','Score','Correct','Total','Played At'];
doc.fontSize(11).text(cols.join(' | '));
doc.moveDown(0.25);

const sampleRows = [
  { session_id: 101, username: 'alice', mode: 'computational', difficulty: 'L1', score: 30, correct_answers: 6, total_questions: 10, played_at: '2026-06-17 10:00' },
  { session_id: 102, username: 'bob',   mode: 'algebra',       difficulty: 'L2', score: 20, correct_answers: 4, total_questions: 10, played_at: '2026-06-17 11:15' },
  { session_id: 103, username: 'carol', mode: 'binary',        difficulty: 'L1', score: 80, correct_answers: 8, total_questions: 10, played_at: '2026-06-17 12:30' }
];

sampleRows.forEach((r) => {
  const line = [r.session_id, r.username, r.mode, r.difficulty, r.score + ' pts', r.correct_answers, r.total_questions, r.played_at].join(' | ');
  doc.text(line);
});

doc.end();

stream.on('finish', () => {
  console.log('Wrote sample PDF to', outFile);
});

stream.on('error', (err) => {
  console.error('Failed to write PDF:', err.message);
  process.exit(1);
});

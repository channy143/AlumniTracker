import { createWorker } from 'tesseract.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_DIR = 'D:\\AlumniDatas';
const TEMP_DIR = 'C:\\Users\\shiro\\.gemini\\antigravity-ide\\brain\\633eddb0-1aea-40f6-b5ce-b6daca744105\\scratch\\ocr_frames';
const SQL_OUT = path.resolve('..', 'supabase', 'insert_eligible_alumni.sql');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function getProgram(fileName) {
  const f = fileName.toUpperCase();
  if (f.includes('BSIT')) return 'BSIT';
  if (f.includes('BEED')) return 'BEEd';
  if (f.includes('BIT')) return 'BIT';
  if (f.includes('BSED')) return 'BSEd-Math';
  if (f.includes('BTLED')) return 'BTLED-HE';
  return 'BSIT';
}

function getYear(folderName) {
  // E.g. "1st Semester 2026-2027" -> 2027
  // "1st&2nd Semester 2023-2024" -> 2024
  // "1st&2nd Semester 2024-2025" -> 2025
  // "1st&2nd Semester 2025-2026" -> 2026
  const m = folderName.match(/\b\d{4}-(\d{4})\b/);
  if (m) return parseInt(m[1], 10);
  const mSingle = folderName.match(/\b(20\d{2})\b/);
  if (mSingle) return parseInt(mSingle[1], 10);
  return 2026;
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseStudentLine(lineText) {
  const trimmed = lineText.trim();
  // Match student ID: 7 digits (e.g. 1387317, 1349747, 1355432)
  const idMatch = trimmed.match(/(?:^|\s)(13\d{5}|\d{6,8})(?:\s+|$)(.*)/);
  if (!idMatch) return null;

  const student_id = idMatch[1];
  const afterId = idMatch[2].trim();

  // Strip anything that looks like address / location words or noise
  const cleanTokens = [];
  const tokens = afterId.split(/\s+/);
  for (const t of tokens) {
    if (/^(CITY|PUROK|PURCK|BRGY|POBLACION|CEBU|BARANGAY|NAGA|DISTRICT|MUNICIPALITY|STREET|SITIO|TALISAY|CARCAR|MINGLANILLA|TOLEDO)$/i.test(t)) {
      break;
    }
    cleanTokens.push(t);
  }

  let namePart = cleanTokens.join(' ').replace(/[^A-Za-z\s\-\']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!namePart) return null;

  const nameWords = namePart.split(' ').filter(w => w.length > 0);
  if (nameWords.length === 0) return null;

  // Check if the last word is a single-letter middle initial
  let middle_name = null;
  if (nameWords.length > 2 && nameWords[nameWords.length - 1].length === 1) {
    middle_name = nameWords.pop().toUpperCase();
  }

  let lastName = nameWords[0];
  let firstName = '';

  // Compound last names
  if (nameWords.length >= 3 && ['DE', 'DEL', 'DELA', 'SAN', 'SANTA', 'VON'].includes(nameWords[0].toUpperCase())) {
    lastName = `${nameWords[0]} ${nameWords[1]}`;
    firstName = nameWords.slice(2).join(' ');
  } else if (nameWords.length >= 2) {
    firstName = nameWords.slice(1).join(' ');
  } else {
    firstName = nameWords[0];
  }

  if (firstName.length < 2 && lastName.length < 2) return null;

  return {
    student_id,
    last_name: toTitleCase(lastName),
    first_name: toTitleCase(firstName || lastName),
    middle_name: middle_name && middle_name.length === 1 ? middle_name : null
  };
}

const PS_RENDER_SCRIPT = path.resolve('scripts', 'render_pdf.ps1');

async function renderPdfPages(pdfPath) {
  try {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${PS_RENDER_SCRIPT}" -PdfPath "${pdfPath}" -OutputDir "${TEMP_DIR}"`;
    const out = execSync(cmd).toString().trim();
    const lines = out.split(/\r?\n/).filter(Boolean);
    const count = parseInt(lines[lines.length - 1], 10);
    return isNaN(count) ? 0 : count;
  } catch (err) {
    console.error(`Failed to render ${pdfPath}:`, err.message);
    return 0;
  }
}

function cleanTempFrames() {
  const files = fs.readdirSync(TEMP_DIR);
  for (const f of files) {
    if (f.startsWith('page_') && f.endsWith('.png')) {
      try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch {}
    }
  }
}

async function main() {
  console.log('=== CTU Naga Alumni Data Extractor ===');
  console.log('Reading PDFs from:', BASE_DIR);

  const folders = fs.readdirSync(BASE_DIR).filter(d => fs.statSync(path.join(BASE_DIR, d)).isDirectory());
  console.log('Found folders:', folders);

  const worker = await createWorker('eng');
  const alumniMap = new Map(); // student_id -> record

  let processedPdfs = 0;
  let totalPagesProcessed = 0;

  for (const folder of folders) {
    const folderPath = path.join(BASE_DIR, folder);
    const yearGraduated = getYear(folder);
    const gradDate = `${yearGraduated}-06-15`;

    const pdfFiles = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.pdf'));
    console.log(`\n--- Folder: ${folder} (Expected Grad: ${yearGraduated}) [${pdfFiles.length} files] ---`);

    for (const pdfFile of pdfFiles) {
      const fullPdfPath = path.join(folderPath, pdfFile);
      const program = getProgram(pdfFile);

      cleanTempFrames();
      process.stdout.write(`Rendering ${pdfFile}... `);
      const pageCount = await renderPdfPages(fullPdfPath);
      process.stdout.write(`${pageCount} pages rendered. OCRing... `);

      let foundInPdf = 0;
      for (let p = 0; p < pageCount; p++) {
        const framePath = path.join(TEMP_DIR, `page_${p}.png`);
        if (!fs.existsSync(framePath)) continue;

        try {
          // Crop region for ID and Name columns
          const ret = await worker.recognize(framePath, {
            rectangle: { left: 80, top: 380, width: 1050, height: 2300 }
          });

          const lines = ret.data.text.split('\n');
          for (const line of lines) {
            const student = parseStudentLine(line);
            if (student) {
              const sid = student.student_id;
              if (!alumniMap.has(sid)) {
                alumniMap.set(sid, {
                  student_id: sid,
                  first_name: student.first_name,
                  middle_name: student.middle_name,
                  last_name: student.last_name,
                  program,
                  year_graduated: yearGraduated,
                  graduation_date: gradDate
                });
                foundInPdf++;
              } else {
                // If existing, update with later year or more complete middle name
                const existing = alumniMap.get(sid);
                if (yearGraduated > existing.year_graduated) {
                  existing.year_graduated = yearGraduated;
                  existing.graduation_date = gradDate;
                  existing.program = program;
                }
                if (!existing.middle_name && student.middle_name) {
                  existing.middle_name = student.middle_name;
                }
              }
            }
          }
        } catch (ocrErr) {
          console.error(`Error on page ${p}:`, ocrErr.message);
        }
      }

      console.log(`+${foundInPdf} new unique students (Total unique so far: ${alumniMap.size})`);
      processedPdfs++;
      totalPagesProcessed += pageCount;
    }
  }

  await worker.terminate();
  cleanTempFrames();

  console.log('\n================ EXTRACTION COMPLETE ================');
  console.log(`Processed ${processedPdfs} PDFs across ${totalPagesProcessed} pages.`);
  console.log(`Total Unique Alumni Extracted: ${alumniMap.size}`);

  // Generate SQL Script
  console.log(`Generating SQL query file: ${SQL_OUT}`);
  const records = Array.from(alumniMap.values());
  records.sort((a, b) => (a.year_graduated - b.year_graduated) || a.last_name.localeCompare(b.last_name));

  const sqlLines = [];
  sqlLines.push('-- =========================================================================');
  sqlLines.push('-- ALUMNI ELIGIBILITY REGISTRY INSERT QUERY');
  sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
  sqlLines.push(`-- Source: D:\\AlumniDatas (${processedPdfs} official graduate roster PDFs)`);
  sqlLines.push(`-- Total Eligible Records: ${records.length}`);
  sqlLines.push('-- =========================================================================\n');
  sqlLines.push('-- Step 1: Ensure required columns exist');
  sqlLines.push('ALTER TABLE public.alumni_eligible ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);');
  sqlLines.push('ALTER TABLE public.alumni_eligible ADD COLUMN IF NOT EXISTS graduation_date DATE;');
  sqlLines.push('ALTER TABLE public.alumni_eligible ALTER COLUMN student_id DROP NOT NULL;');
  sqlLines.push('ALTER TABLE public.alumni_eligible ALTER COLUMN birth_date DROP NOT NULL;\n');
  sqlLines.push('-- Step 2: Insert / update eligible alumni records');

  // Insert in batches of 200 for safe SQL execution
  const BATCH_SIZE = 200;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    sqlLines.push(`\n-- Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)`);
    sqlLines.push('INSERT INTO public.alumni_eligible (student_id, first_name, middle_name, last_name, program, year_graduated, graduation_date, user_id)');
    sqlLines.push('VALUES');

    const valueRows = batch.map((r, idx) => {
      const escape = (s) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
      const comma = idx === batch.length - 1 ? '' : ',';
      return `  (${escape(r.student_id)}, ${escape(r.first_name)}, ${escape(r.middle_name)}, ${escape(r.last_name)}, ${escape(r.program)}, ${r.year_graduated || 'NULL'}, ${escape(r.graduation_date)}, NULL)${comma}`;
    });

    sqlLines.push(valueRows.join('\n'));
    sqlLines.push('ON CONFLICT (student_id) DO UPDATE SET');
    sqlLines.push('  first_name = EXCLUDED.first_name,');
    sqlLines.push('  middle_name = COALESCE(EXCLUDED.middle_name, public.alumni_eligible.middle_name),');
    sqlLines.push('  last_name = EXCLUDED.last_name,');
    sqlLines.push('  program = EXCLUDED.program,');
    sqlLines.push('  year_graduated = GREATEST(public.alumni_eligible.year_graduated, EXCLUDED.year_graduated),');
    sqlLines.push('  graduation_date = EXCLUDED.graduation_date');
    sqlLines.push('WHERE public.alumni_eligible.user_id IS NULL;\n');
  }

  // Summary query to view counts
  sqlLines.push('\n-- Step 3: Verification queries');
  sqlLines.push('SELECT program, year_graduated, COUNT(*) as unclaimed_count');
  sqlLines.push('FROM public.alumni_eligible');
  sqlLines.push('WHERE user_id IS NULL');
  sqlLines.push('GROUP BY program, year_graduated');
  sqlLines.push('ORDER BY year_graduated DESC, program ASC;\n');

  fs.writeFileSync(SQL_OUT, sqlLines.join('\n'), 'utf8');
  console.log(`Successfully written SQL script with ${records.length} alumni to ${SQL_OUT}`);
}

main().catch(console.error);

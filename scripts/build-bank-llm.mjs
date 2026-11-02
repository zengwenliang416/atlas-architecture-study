/**
 * Rebuild packages/bank-llm from the source docx.
 * Wording stays as written. Answers lose only leading and trailing whitespace.
 * The second heading 「填空题」 is 判断题: each item has options A. 对 / B. 错.
 */
import { inflateRawSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(process.argv[2] ?? resolve(root, 'packages/bank-llm/source.docx'));
const outputs = [
  resolve(root, 'packages/bank-llm/src/questions.js'),
  resolve(root, 'dist/llm-data.js'),
];

const OPT = /^[\t ]*([A-D])[.．、]\s*(.*)$/;
const ANS = /^【正确答案】(.*)$/;
const HEADER = /^\s*\*\*\*(.+?)\*\*\*\s*$/;
const KINDS = ['填空题', '单选题', '多选题', '判断题'];

function readZipEntry(buf, name) {
  let offset = 0;
  while (offset + 30 < buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const flags = buf.readUInt16LE(offset + 6);
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const entryName = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    if (flags & 0x8) throw new Error(`${name}: data descriptor is not supported`);
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (entryName === name) {
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`${name}: zip method ${method}`);
    }
    offset = dataStart + compSize;
  }
  throw new Error(`zip 里没有 ${name}`);
}

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function paragraphs(xml) {
  const rows = [];
  const blocks = xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g);
  for (const block of blocks) {
    let text = '';
    const tokens = block[1].matchAll(/<w:tab\/>|<w:br\/>|<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
    for (const token of tokens) {
      if (token[0].startsWith('<w:tab')) text += '\t';
      else if (token[0].startsWith('<w:br')) text += '\n';
      else text += decodeXml(token[1]);
    }
    rows.push(text);
  }
  return rows;
}

function cleanStem(text) {
  let stem = text.replace(/^\t+/, '');
  if (stem.startsWith('【') && !stem.startsWith('【正确答案】')) stem = stem.slice(1);
  return stem;
}

function titleFrom(stem) {
  const flat = stem.replace(/\s+/g, ' ').trim();
  return flat.length <= 24 ? flat : flat.slice(0, 24);
}

function answerLetters(answer) {
  return answer.split(/[、,，]/).map((part) => part.trim()).filter(Boolean);
}

function parse(lines) {
  const questions = [];
  let ordinal = 0;
  let index = 0;
  while (index < lines.length) {
    const raw = lines[index];
    if (raw.trim() === '') {
      index += 1;
      continue;
    }
    const header = HEADER.exec(raw);
    if (header) {
      ordinal += 1;
      if (!KINDS[ordinal - 1]) throw new Error(`未预期的小节：${header[1]}`);
      index += 1;
      continue;
    }
    if (!ordinal) throw new Error(`小节之前出现了正文：${raw.slice(0, 40)}`);
    const block = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !HEADER.test(lines[index]) &&
      !ANS.test(lines[index].trim())
    ) {
      block.push(lines[index]);
      index += 1;
    }
    if (index >= lines.length || !ANS.test(lines[index].trim())) {
      throw new Error(`第 ${index + 1} 行附近没有【正确答案】`);
    }
    const answer = ANS.exec(lines[index].trim())[1].trim();
    index += 1;
    let splitAt = block.length;
    while (splitAt > 0 && OPT.test(block[splitAt - 1])) splitAt -= 1;
    const stem = block.slice(0, splitAt).map(cleanStem).join('\n');
    const options = block.slice(splitAt).map((line) => {
      const match = OPT.exec(line);
      if (!match) throw new Error(`选项无法识别：${line}`);
      return { id: match[1], name: match[2].replace(/\s+$/u, '') };
    });
    if (!stem) throw new Error(`第 ${questions.length + 1} 题没有题干`);
    if (!answer) throw new Error(`第 ${questions.length + 1} 题答案为空`);
    const kind = KINDS[ordinal - 1];
    const letters = options.length ? answerLetters(answer) : [];
    if (options.length) {
      const ids = new Set(options.map((option) => option.id));
      for (const letter of letters) {
        if (!ids.has(letter)) throw new Error(`${kind} 答案 ${answer} 不在选项里：${stem.slice(0, 40)}`);
      }
    }
    if (kind === '多选题' && letters.length < 2) throw new Error(`多选题答案不是一组字母：${answer}`);
    if (kind === '判断题') {
      const names = options.map((option) => option.name);
      if (names.join('|') !== '对|错') throw new Error(`判断题选项不是对/错：${stem.slice(0, 40)}`);
    }
    if (kind === '填空题' && options.length) throw new Error(`填空题带了选项：${stem.slice(0, 40)}`);
    const byId = new Map(options.map((option) => [option.id, option.name]));
    questions.push({
      id: `L${questions.length + 1}`,
      title: titleFrom(stem),
      topic: '大模型',
      kind,
      stem,
      blanks: [
        {
          label: '本题',
          answer: options.length ? letters.map((letter) => byId.get(letter)).join('、') : answer,
          letter: options.length ? answer : '',
          options: options.map((option) => ({
            id: option.id,
            name: option.name,
            meaning: '',
            reason: '',
            correct: letters.includes(option.id),
          })),
        },
      ],
      concept: '',
      steps: [],
      core: [],
      example: '',
      pitfalls: [],
      motto: '',
      source: '',
      summary: [],
    });
  }
  const counts = Object.fromEntries(KINDS.map((kind) => [kind, questions.filter((item) => item.kind === kind).length]));
  if (questions.length !== 305 || counts['填空题'] !== 42 || counts['单选题'] !== 94 || counts['多选题'] !== 78 || counts['判断题'] !== 91) {
    throw new Error(`题量不符 ${JSON.stringify(counts)} / ${questions.length}`);
  }
  return questions;
}

const xml = readZipEntry(readFileSync(sourcePath), 'word/document.xml').toString('utf8');
const questions = parse(paragraphs(xml));
const body = `// Generated by scripts/build-bank-llm.mjs from packages/bank-llm/source.docx. Do not edit by hand.\nexport const DATA = ${JSON.stringify(questions, null, 2)};\n`;
for (const output of outputs) writeFileSync(output, body);
console.log(`wrote ${questions.length} questions to ${outputs.length} files`);

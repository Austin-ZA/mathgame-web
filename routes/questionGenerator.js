// routes/questionGenerator.js
// Direct JavaScript port of QuestionGenerator.java

function rng(n) { return Math.floor(Math.random() * n); }
function rngBool() { return Math.random() < 0.5; }

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function pickFrom(...values) { return values[rng(values.length)]; }

// ─── Multiple choice wrapper ───────────────────────────────────────────────
function makeMultipleChoice(questionText, correctAnswer, steps) {
  const choices = [correctAnswer];
  const num = parseFloat(correctAnswer.replace('/', '.'));
  if (!isNaN(num)) {
    const used = new Set([correctAnswer]);
    while (choices.length < 4) {
      let offset = rng(8) + 1;
      if (rngBool()) offset = -offset;
      const wrong = num + offset;
      const ws = Number.isInteger(wrong) ? String(wrong) : String(wrong);
      if (!used.has(ws)) { choices.push(ws); used.add(ws); }
    }
  } else {
    choices.push('0', '1', '2');
  }
  // shuffle
  for (let i = choices.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { questionText, correctAnswer, options: choices, solutionSteps: steps, isMultipleChoice: true };
}

function makeTypein(questionText, correctAnswer, steps) {
  return { questionText, correctAnswer, options: null, solutionSteps: steps, isMultipleChoice: false };
}

// ─── Computational ─────────────────────────────────────────────────────────
function level1() {
  let a = rng(20) + 1, b = rng(20) + 1;
  let op, answer;
  if (rngBool()) { op = '+'; answer = a + b; }
  else { if (a < b) { [a, b] = [b, a]; } op = '-'; answer = a - b; }
  const steps = `Step 1: Identify the values: ${a} and ${b}.\nStep 2: Perform ${op === '+' ? 'addition' : 'subtraction'}: ${a} ${op} ${b} = ${answer}.\nStep 3: Answer = ${answer}.`;
  return makeMultipleChoice(`${a} ${op} ${b} = ?`, String(answer), steps);
}

function level2() {
  if (rngBool()) {
    const a = rng(12) + 2, b = rng(12) + 2, answer = a * b;
    const steps = `Step 1: Multiply ${a} by ${b}.\nStep 2: ${a} × ${b} = ${answer}.\nStep 3: Answer = ${answer}.`;
    return makeMultipleChoice(`${a} × ${b} = ?`, String(answer), steps);
  } else {
    const b = rng(10) + 2, answer = rng(15) + 2, a = b * answer;
    const steps = `Step 1: Divide ${a} by ${b}.\nStep 2: ${b} × ${answer} = ${a}, so ${a} ÷ ${b} = ${answer}.\nStep 3: Answer = ${answer}.`;
    return makeMultipleChoice(`${a} ÷ ${b} = ?`, String(answer), steps);
  }
}

function level3() {
  if (rngBool()) {
    const a = rng(10) + 1, b = rng(9) + 2, c = rng(9) + 2, answer = a + (b * c);
    const steps = `Step 1: Apply BODMAS — Multiplication before Addition.\nStep 2: ${b} × ${c} = ${b * c}.\nStep 3: ${a} + ${b * c} = ${answer}.\nStep 4: Answer = ${answer}.`;
    return makeMultipleChoice(`${a} + ${b} × ${c} = ?`, String(answer), steps);
  } else {
    const a = rng(40) + 10, b = rng(8) + 3, answer = a % b, quotient = Math.floor(a / b);
    const steps = `Step 1: MOD gives the remainder after division.\nStep 2: Divide ${a} by ${b}: ${b} × ${quotient} = ${a - answer}.\nStep 3: Remainder = ${a} - ${a - answer} = ${answer}.\nStep 4: ${a} MOD ${b} = ${answer}.`;
    return makeMultipleChoice(`${a} MOD ${b} = ?`, String(answer), steps);
  }
}

function level4() {
  if (rngBool()) {
    const denom = pickFrom(2, 3, 4, 5, 6, 8, 10);
    const numA = rng(denom - 1) + 1, numC = rng(denom - 1) + 1;
    const sumNum = numA + numC, g = gcd(sumNum, denom);
    const sNum = sumNum / g, sDen = denom / g;
    const answer = sDen === 1 ? String(sNum) : `${sNum}/${sDen}`;
    const steps = `Step 1: Same denominator — add numerators directly.\nStep 2: (${numA} + ${numC}) / ${denom} = ${sumNum}/${denom}.\n${g > 1 ? `Step 3: Simplify by dividing by GCD (${g}): ${answer}.\n` : 'Step 3: Already in simplest form.\n'}Step 4: Answer = ${answer}.`;
    return makeMultipleChoice(`${numA}/${denom} + ${numC}/${denom} = ?`, answer, steps);
  } else {
    const a = Math.round((Math.random() * 9 + 0.1) * 10) / 10;
    const b = Math.round((Math.random() * 9 + 0.1) * 10) / 10;
    const answer = Math.round((a + b) * 10) / 10;
    const steps = `Step 1: Align decimal points.\nStep 2: Add: ${a} + ${b} = ${answer}.\nStep 3: Answer = ${answer}.`;
    return makeMultipleChoice(`${a} + ${b} = ?`, String(answer), steps);
  }
}

function level5() {
  const a = rng(10) + 1, b = rng(10) + 1, c = rng(8) + 2, e = rng(5) + 2;
  const d = e * (rng(6) + 1);
  const answer = (a + b) * c - Math.floor(d / e);
  const steps = `Step 1: Apply PEMDAS — Brackets first.\nStep 2: (${a} + ${b}) = ${a + b}.\nStep 3: Perform division next: ${d} ÷ ${e} = ${Math.floor(d / e)}.\nStep 4: Perform multiplication: ${a + b} × ${c} = ${(a + b) * c}.\nStep 5: Final subtraction: ${(a + b) * c} - ${Math.floor(d / e)} = ${answer}.\nStep 6: Answer = ${answer}.`;
  return makeMultipleChoice(`(${a} + ${b}) × ${c} - ${d} ÷ ${e} = ?`, String(answer), steps);
}

// ─── Algebra ───────────────────────────────────────────────────────────────
function algebraL1() {
  const a = rng(15) + 1, x = rng(15) + 1, b = x + a;
  const steps = `Step 1: Isolate x by subtracting ${a} from both sides.\nStep 2: x = ${b} - ${a}.\nStep 3: x = ${x}.\nStep 4: Verify: ${x} + ${a} = ${b} ✓`;
  return makeTypein(`Solve for x:  x + ${a} = ${b}`, String(x), steps);
}

function algebraL2() {
  const a = rng(8) + 2, x = rng(10) + 1, b = rng(15) + 1, c = a * x + b;
  const steps = `Step 1: Subtract ${b} from both sides: ${a}x = ${c} - ${b} = ${c - b}.\nStep 2: Divide both sides by ${a}: x = ${c - b} ÷ ${a}.\nStep 3: x = ${x}.\nStep 4: Verify: ${a}(${x}) + ${b} = ${a * x + b} = ${c} ✓`;
  return makeTypein(`Solve for x:  ${a}x + ${b} = ${c}`, String(x), steps);
}

function algebraL3() {
  const x = rng(8) + 2, a = rng(5) + 3, c = rng(a - 1) + 1, b = rng(10) + 1;
  const d = (a - c) * x - b;
  const steps = `Step 1: Move x terms to the left: ${a}x - ${c}x = ${d} + ${b}.\nStep 2: ${a - c}x = ${d + b}.\nStep 3: x = ${d + b} ÷ ${a - c}.\nStep 4: x = ${x}.\nStep 5: Verify: ${a}(${x}) - ${b} = ${a * x - b}  |  ${c}(${x}) + ${d} = ${c * x + d} ✓`;
  return makeTypein(`Solve for x:  ${a}x - ${b} = ${c}x + ${d}`, String(x), steps);
}

function algebraL4() {
  const x = rng(6) + 1, a = rng(5) + 2, b = rng(8) + 1, answer = a * x * x - b * x + 3;
  const steps = `Step 1: Substitute x = ${x}.\nStep 2: ${a}(${x})² - ${b}(${x}) + 3.\nStep 3: ${a} × ${x * x} - ${b * x} + 3.\nStep 4: ${a * x * x} - ${b * x} + 3.\nStep 5: Answer = ${answer}.`;
  return makeTypein(`If x = ${x}, evaluate:  ${a}x² - ${b}x + 3`, String(answer), steps);
}

function algebraL5() {
  const r1 = rng(8) + 1, r2 = rng(8) + 1;
  const bCoeff = r1 + r2, cCoeff = r1 * r2;
  const answer = r1 === r2 ? `-${r1}` : `-${r1} or -${r2}`;
  const steps = `Step 1: Factorise the quadratic.\nStep 2: Find two numbers that multiply to ${cCoeff} and add to ${bCoeff}.\nStep 3: Those numbers are ${r1} and ${r2}.\nStep 4: (x + ${r1})(x + ${r2}) = 0.\nStep 5: x + ${r1} = 0  →  x = -${r1}.\nStep 6: x + ${r2} = 0  →  x = -${r2}.\nStep 7: Answer: x = -${r1} or x = -${r2}.`;
  return makeTypein(`Solve:  x² + ${bCoeff}x + ${cCoeff} = 0`, answer, steps);
}

// ─── Binary ────────────────────────────────────────────────────────────────
function binDecToBin() {
  const dec = rng(255) + 1;
  const binary = dec.toString(2);
  let steps = 'Step 1: Repeatedly divide by 2, record remainders.\n';
  let n = dec, s = 2;
  while (n > 0) { steps += `Step ${s++}: ${n} ÷ 2 = ${Math.floor(n / 2)} remainder ${n % 2}.\n`; n = Math.floor(n / 2); }
  steps += `Step ${s}: Read remainders bottom-up: ${binary}.\nStep ${s + 1}: Answer = ${binary}.`;
  return makeTypein(`Convert decimal ${dec} to binary.`, binary, steps);
}

function binBinToDec() {
  const dec = rng(255) + 1;
  const binary = dec.toString(2);
  const len = binary.length;
  let calc = 'Step 2: ';
  for (let i = 0; i < len; i++) { calc += `${binary[i]}×2^${len - 1 - i}`; if (i < len - 1) calc += ' + '; }
  const steps = `Step 1: Write positional values (powers of 2) right to left.\n${calc}.\nStep 3: = ${dec}.\nStep 4: Answer = ${dec}.`;
  return makeTypein(`Convert binary ${binary} to decimal.`, String(dec), steps);
}

function binBinToHex() {
  const val = rng(255) + 1;
  const binary = val.toString(2);
  const hex = val.toString(16).toUpperCase();
  const len = binary.length;
  let calc = 'Step 2: ';
  for (let i = 0; i < len; i++) { calc += `${binary[i]}×2^${len - 1 - i}`; if (i < len - 1) calc += ' + '; }
  const steps = `Step 1: Convert binary ${binary} to decimal first.\n${calc}.\nStep 3: = ${val}.\nStep 4: Convert decimal ${val} to hex: ${hex}.\nStep 5: Answer = ${hex}.`;
  return makeTypein(`Convert binary ${binary} to hexadecimal.`, hex, steps);
}

function binHexToDec() {
  const val = rng(255) + 1;
  const hex = val.toString(16).toUpperCase();
  const len = hex.length;
  let calc = 'Step 2: ';
  for (let i = 0; i < len; i++) { calc += `${hex[i]}×16^${len - 1 - i}`; if (i < len - 1) calc += ' + '; }
  const steps = `Step 1: Write positional values (powers of 16) right to left.\n${calc}.\nStep 3: = ${val}.\nStep 4: Answer = ${val}.`;
  return makeTypein(`Convert hexadecimal ${hex} to decimal.`, String(val), steps);
}

// ─── Public API ────────────────────────────────────────────────────────────
function generateComputational(level) {
  return [null, level1, level2, level3, level4, level5][level]?.() ?? level1();
}

function generateAlgebra(level) {
  return [null, algebraL1, algebraL2, algebraL3, algebraL4, algebraL5][level]?.() ?? algebraL1();
}

function generateBinary() {
  return [binDecToBin, binBinToDec, binBinToHex, binHexToDec][rng(4)]();
}

module.exports = { generateComputational, generateAlgebra, generateBinary };

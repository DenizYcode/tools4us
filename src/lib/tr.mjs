// Turkish number suffixes for the live result count: "27 modelden 4'ü", "27 modelden 6'sı".
// The suffix follows the last vowel of how the number is spoken (dört -> ö -> ü), and takes a buffer "s"
// when the spoken number ends in a vowel (altı -> 6'sı). Covers 0-9999, which is more than any catalog.

const BY_DIGIT = { 0: 'ı', 1: 'i', 2: 'i', 3: 'ü', 4: 'ü', 5: 'i', 6: 'ı', 7: 'i', 8: 'i', 9: 'u' }; // sıfır bir iki üç dört beş altı yedi sekiz dokuz
const ENDS_IN_VOWEL_DIGIT = new Set([2, 6, 7]); // iki, altı, yedi
const BY_TENS = { 1: ['u', false], 2: ['i', true], 3: ['u', false], 4: ['ı', false], 5: ['i', true], 6: ['ı', false], 7: ['i', false], 8: ['i', false], 9: ['ı', false] }; // on yirmi otuz kırk elli altmış yetmiş seksen doksan

/** The possessive form of a count: 4 -> "4'ü", 6 -> "6'sı", 20 -> "20'si", 100 -> "100'ü". */
export function trPossessive(n) {
  const num = Math.max(0, Math.floor(Number(n) || 0));
  const digits = String(num);
  const last = Number(digits.at(-1));
  let vowel;
  let buffer;
  if (last !== 0) {
    vowel = BY_DIGIT[last];
    buffer = ENDS_IN_VOWEL_DIGIT.has(last);
  } else if (num === 0) {
    vowel = 'ı';
    buffer = false;
  } else {
    const tens = Number(digits.at(-2) ?? 0);
    if (tens !== 0) {
      [vowel, buffer] = BY_TENS[tens];
    } else if (num % 1000 === 0) {
      vowel = 'i'; // bin
      buffer = false;
    } else {
      vowel = 'ü'; // yüz
      buffer = false;
    }
  }
  const harmony = { ı: 'ı', i: 'i', u: 'u', ü: 'ü' }[vowel];
  return `${num}'${buffer ? 's' : ''}${harmony}`;
}

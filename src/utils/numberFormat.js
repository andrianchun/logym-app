/**
 * Formats a number with thousands separators and localized decimal points.
 * @param {number|string} value - The number to format
 * @param {string} language - 'ID' for Indonesian (dots for thousands, comma for decimal), 'EN' for English. Default is 'ID'.
 * @param {number} maximumFractionDigits - Max decimal places (default 2)
 * @returns {string} The formatted string
 */
export const formatNumber = (value, language = 'ID', maximumFractionDigits = 2) => {
    if (value === null || value === undefined || value === '') return '';
    
    // Convert to number, handle string inputs safely
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '.')) : Number(value);
    
    if (isNaN(num)) return value; // Fallback to original if not a number

    const locale = language === 'ID' ? 'id-ID' : 'en-US';
    return new Intl.NumberFormat(locale, {
        maximumFractionDigits,
    }).format(num);
};

/**
 * Pecah durasi tidur (jam desimal) jadi { jam, menit } bulat.
 *
 * Menit dibulatkan dari TOTAL menit, bukan dari sisa pecahannya sendiri. Cara lama
 * (`Math.round((h % 1) * 60)`) menghasilkan "5 jam 60 mnt" untuk 5,999 jam — jam-nya tidak ikut
 * naik karena bagian bulatnya dihitung terpisah sebelum pembulatan.
 *
 * @param {number|string} hours
 * @returns {{jam:number, menit:number}|null} null kalau tidak ada data
 */
export const sleepHoursToParts = (hours) => {
  const h = typeof hours === 'string' ? parseFloat(hours) : Number(hours);
  if (!Number.isFinite(h) || h <= 0) return null;
  const total = Math.round(h * 60);
  return { jam: Math.floor(total / 60), menit: total % 60 };
};

/**
 * Durasi tidur sebagai teks: "5 jam 18 mnt". Dipakai di tempat yang butuh satu string utuh
 * (tooltip grafik); kartu tidur memakai sleepHoursToParts karena tiap angkanya digayakan sendiri.
 */
export const formatSleepDuration = (hours) => {
  const p = sleepHoursToParts(hours);
  if (!p) return '-';
  if (p.jam === 0) return `${p.menit} mnt`;
  if (p.menit === 0) return `${p.jam} jam`;
  return `${p.jam} jam ${p.menit} mnt`;
};

/**
 * Parses a localized number string back to a valid JS number (float).
 * Useful for inputs.
 * @param {string} formattedValue - The localized string
 * @param {string} language - 'ID' or 'EN'
 * @returns {number|string} The raw parsed number (or empty string if invalid)
 */
export const parseFormattedNumber = (formattedValue, language = 'ID') => {
    if (formattedValue === null || formattedValue === undefined || formattedValue === '') return '';
    
    let str = formattedValue.toString();
    
    if (language === 'ID') {
        if (str.includes(',')) {
            // Comma is present, it acts as the decimal separator. All dots are thousands separators.
            str = str.replace(/\./g, '').replace(/,/g, '.');
        } else {
            // No comma. Check if the last dot is acting as a decimal separator.
            // Di mode ID, kita asumsikan semua titik (dot) adalah pemisah ribuan.
            // Input desimal dari keyboard numpad (.) sudah di-intercept di SwipeInput menjadi koma (,).
            str = str.replace(/\./g, '');
        }
    } else {
        // EN mode: commas are thousands separators, dot is decimal.
        if (str.includes('.')) {
            // Dot is present, so comma is definitively a thousands separator.
            str = str.replace(/,/g, '');
        } else {
            // No dot. Check if the last comma is acting as a decimal separator.
            const lastCommaIndex = str.lastIndexOf(',');
            if (lastCommaIndex !== -1) {
                const charsAfterComma = str.length - 1 - lastCommaIndex;
                if (charsAfterComma < 3) {
                    // It's a decimal separator (e.g., "10,5", "10,")
                    const integerPart = str.substring(0, lastCommaIndex).replace(/,/g, '');
                    const fractionalPart = str.substring(lastCommaIndex + 1);
                    str = integerPart + '.' + fractionalPart;
                } else {
                    // 3 or more digits after the comma (e.g., "1,000", "1,0000"). Assume thousands separator.
                    str = str.replace(/,/g, '');
                }
            }
        }
    }
    
    return str;
};

const startYmd = '2026-09-01';
const endYmd = '2026-10-01';
const startISO = new Date(`${startYmd}T00:00:00`).toISOString();
const endISO = new Date(`${endYmd}T23:59:59`).toISOString();
console.log('startISO:', startISO);
console.log('endISO:', endISO);

// Now what if sleep sample is:
// Sleep from 2026-09-30 23:00 to 2026-10-01 07:00 WIB (which is 2026-09-30 16:00 UTC to 2026-10-01 00:00 UTC)
const sample = {
  startDate: new Date('2026-09-30T23:00:00+07:00').toISOString(),
  endDate: new Date('2026-10-01T07:00:00+07:00').toISOString(),
};
console.log('sample startDate:', sample.startDate);
console.log('sample endDate:', sample.endDate);

// What does ymdOf(sample.endDate) produce?
const ymdOf = (isoStr) => {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
console.log('ymdOf(sample.endDate):', ymdOf(sample.endDate));

export function filterChoices<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
  getValue: (item: T) => string,
  matchFn?: (item: T) => string[]
) {
  const q = (query || '').toLowerCase().trim();
  return items
    .filter((item) => {
      const matchTargets = matchFn ? matchFn(item) : [getLabel(item), getValue(item)];
      return matchTargets.some((t) => t.toLowerCase().includes(q));
    })
    .slice(0, 25)
    .map((item) => ({ name: getLabel(item), value: getValue(item) }));
}

export function isToday(dateIso?: string): boolean {
  if (!dateIso) return false;
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const match = new Date(dateIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return now === match;
}

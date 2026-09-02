export interface AutocompleteContext {
  channelId: string;
  matchId: string;
  teamKey: 'teamA' | 'teamB';
  campData: any;
  subName: string;
  fName: string;
  query: string;
}

export function filterChoices<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
  getValue: (item: T) => string,
  getSearchTerms?: (item: T) => string[]
): { name: string; value: string }[] {
  const q = (query || '').toLowerCase().trim();
  const matched = items.filter((it) => {
    if (!q) return true;
    const label = getLabel(it).toLowerCase();
    const val = getValue(it).toLowerCase();
    if (label.includes(q) || val.includes(q)) return true;
    if (getSearchTerms) {
      return getSearchTerms(it).some((term) => term.toLowerCase().includes(q));
    }
    return false;
  });

  return matched.slice(0, 25).map((it) => ({
    name: getLabel(it).slice(0, 100),
    value: getValue(it).slice(0, 100),
  }));
}

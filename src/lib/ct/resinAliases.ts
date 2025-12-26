export const resinKeyAliases: Record<string, string> = {
  "PET GF30": "PET",
};

/**
 * Returns the given resin alongside any known aliases. The original value is always first.
 */
export function expandResinKeys(resin: string): string[] {
  const aliases = new Set<string>();
  aliases.add(resin);

  const canonical = resinKeyAliases[resin];
  if (canonical) aliases.add(canonical);

  Object.entries(resinKeyAliases).forEach(([alias, target]) => {
    if (target === resin) aliases.add(alias);
  });

  return Array.from(aliases);
}

/**
 * Adds alias entries so lookups work for both the canonical name and its aliases.
 */
export function addResinAliasesToRecord<T>(record: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = { ...record };

  Object.entries(record).forEach(([key, value]) => {
    expandResinKeys(key).forEach((alias) => {
      if (result[alias] === undefined) {
        result[alias] = value;
      }
    });
  });

  return result;
}

/**
 * Adds alias keys for map-based lookups (e.g., resin + grade combinations).
 */
export function addResinAliasesToEntries<T>(entries: Iterable<[string, T]>): Map<string, T> {
  const expanded: [string, T][] = [];

  Array.from(entries).forEach(([key, value]) => {
    const [resin, grade] = key.split("||");
    if (resin && grade) {
      expandResinKeys(resin).forEach((alias) => {
        expanded.push([`${alias}||${grade}`, value]);
      });
    } else {
      expanded.push([key, value]);
    }
  });

  return new Map(expanded);
}

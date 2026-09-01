/**
 * What searching this room actually does.
 *
 * One matcher, used by the bar on the front page and by the search page, so
 * the two can never disagree about what a query finds.
 *
 * ## It searches the catalogue, not the documents
 *
 * There are no document bodies yet. What is indexed is everything the room
 * knows about a document — its title, what it is, what it covers, what a reader
 * will find in it, its planned contents and its topics — and the interface says
 * so rather than implying a full-text search that does not exist. When
 * documents land, the same shape of result takes a body excerpt instead of a
 * catalogue line, and nothing above this has to change.
 */

import { DOCUMENTS, SECTIONS, type DataDoc, type DocStatus } from './catalogue';

export interface Hit {
  doc: DataDoc;
  /** How well it matched. Higher first. */
  score: number;
  /** Where the match was found: 'title', 'topic', 'discovery'… */
  field: string;
  /** The line the match was found in, for showing the reader. */
  snippet: string;
}

export interface Filters {
  section?: string;
  status?: DocStatus;
  topic?: string;
}

const sectionTitle = (id: string) => SECTIONS.find((s) => s.id === id)?.title ?? '';

/**
 * Search the room.
 *
 * Scored rather than filtered so the ordering means something: a query in a
 * title outranks the same query buried in a topic list, and a reader looking
 * for "Falcon" gets the cryptography architecture before the whitepaper that
 * mentions it in passing.
 */
export function search(query: string, filters: Filters = {}): Hit[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const pool = DOCUMENTS.filter((doc) => {
    if (filters.section && doc.section !== filters.section) return false;
    if (filters.status && doc.status !== filters.status) return false;
    if (filters.topic && !doc.topics.includes(filters.topic)) return false;
    return true;
  });

  // No query is a browse rather than a search: everything the filters allow,
  // in catalogue order.
  if (terms.length === 0) {
    return pool.map((doc) => ({
      doc,
      score: 0,
      field: 'description',
      snippet: doc.description,
    }));
  }

  const hits: Hit[] = [];

  for (const doc of pool) {
    let score = 0;
    let field = '';
    let snippet = '';

    const consider = (weight: number, where: string, text: string) => {
      const hay = text.toLowerCase();
      let matched = 0;
      for (const term of terms) if (hay.includes(term)) matched++;
      if (matched === 0) return;
      const value = weight * matched;
      score += value;
      // The best field so far is the one the reader is shown.
      if (value > 0 && (field === '' || weight > WEIGHT[field])) {
        field = where;
        snippet = text;
      }
    };

    consider(WEIGHT.title, 'title', doc.title);
    consider(WEIGHT.topic, 'topic', doc.topics.join(' · '));
    consider(WEIGHT.kind, 'kind', doc.kind);
    consider(WEIGHT.section, 'section', sectionTitle(doc.section));
    consider(WEIGHT.description, 'description', doc.description);
    for (const line of doc.discover) consider(WEIGHT.discovery, 'discovery', line);
    for (const line of doc.contents ?? []) consider(WEIGHT.contents, 'contents', line);

    if (score > 0) hits.push({ doc, score, field, snippet });
  }

  return hits.sort(
    (a, b) => b.score - a.score || a.doc.section.localeCompare(b.doc.section) || a.doc.index.localeCompare(b.doc.index),
  );
}

/**
 * What a match in each place is worth.
 *
 * A title match is the strongest signal there is; a topic tag is close behind
 * because tags are chosen, not incidental; a line of prose is the weakest,
 * because prose mentions things it is not about.
 */
const WEIGHT: Record<string, number> = {
  title: 100,
  topic: 60,
  kind: 40,
  discovery: 30,
  contents: 24,
  section: 20,
  description: 16,
};

/** Split a line around the query terms, so a match can be shown highlighted. */
export function highlight(text: string, query: string): Array<{ text: string; hit: boolean }> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) return [{ text, hit: false }];

  const pattern = new RegExp(`(${terms.map(escape).join('|')})`, 'ig');
  return text
    .split(pattern)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, hit: terms.includes(part.toLowerCase()) }));
}

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

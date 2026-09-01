'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  SECTIONS,
  STATUS_LABEL,
  allTopics,
  findSection,
  type DocStatus,
} from './catalogue';
import { highlight, search, type Filters, type Hit } from './matcher';
import { Status } from './Status';

/**
 * The bar on the front of the room.
 *
 * Answers as it is typed rather than on submit, because the question a first
 * visitor has is usually "is there anything in here about X", and making them
 * press return to find out that there is not is a worse answer than showing
 * them immediately. Six results and a way through to the rest.
 */
export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const hits = useMemo(() => (query.trim() ? search(query).slice(0, 6) : []), [query]);
  const total = useMemo(() => (query.trim() ? search(query).length : 0), [query]);

  const go = () => {
    if (query.trim()) router.push(`/data-room/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="room-search" data-open={String(hits.length > 0)}>
      <p className="room-search-label">Search the QuFi data room</p>

      <div className="room-search-field">
        <i className="room-search-mark" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') go();
          }}
          placeholder="Search documents, technologies, products and topics…"
          aria-label="Search the data room"
        />
        {query ? (
          <button type="button" className="room-search-go" onClick={go}>
            All {total}
          </button>
        ) : null}
      </div>

      {hits.length > 0 ? (
        <ul className="room-search-quick">
          {hits.map((hit) => (
            <li key={hit.doc.id}>
              <Link href={`/data-room/document/${hit.doc.id}`}>
                <span className="quick-title">{hit.doc.title}</span>
                <span className="quick-where">
                  {findSection(hit.doc.section)?.index} — {findSection(hit.doc.section)?.title}
                </span>
                <span className="quick-snippet">
                  {highlight(hit.snippet, query).map((part, i) =>
                    part.hit ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>,
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {query.trim() && hits.length === 0 ? (
        <p className="room-search-none">
          Nothing matches “{query.trim()}”. The index covers document titles, descriptions,
          topics and planned contents — the documents themselves are still being written.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The search page.
 *
 * The same matcher with the filters exposed. Everything is in the URL, so a
 * result set can be sent to somebody.
 */
export function SearchPage({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>({});
  const hits = useMemo(() => search(query, filters), [query, filters]);
  const topics = useMemo(() => allTopics(), []);

  const set = (patch: Filters) => setFilters((was) => ({ ...was, ...patch }));
  const active = Boolean(filters.section || filters.status || filters.topic);

  return (
    <div className="room-find">
      <div className="room-search room-search-page">
        <div className="room-search-field">
          <i className="room-search-mark" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents, technologies, products and topics…"
            aria-label="Search the data room"
            autoFocus
          />
        </div>
      </div>

      <div className="room-filters">
        <Filter
          label="Section"
          value={filters.section}
          options={SECTIONS.map((s) => [s.id, `${s.index} ${s.title}`])}
          onPick={(section) => set({ section })}
        />
        <Filter
          label="Status"
          value={filters.status}
          options={(Object.keys(STATUS_LABEL) as DocStatus[]).map((s) => [s, STATUS_LABEL[s]])}
          onPick={(status) => set({ status: status as DocStatus | undefined })}
        />
        <Filter
          label="Topic"
          value={filters.topic}
          options={topics.map((t) => [t, t])}
          onPick={(topic) => set({ topic })}
        />
        {active ? (
          <button type="button" className="room-filter-clear" onClick={() => setFilters({})}>
            Clear
          </button>
        ) : null}
      </div>

      <p className="room-find-count">
        {hits.length} {hits.length === 1 ? 'document' : 'documents'}
        {query.trim() ? ` matching “${query.trim()}”` : ''}
      </p>

      <ul className="room-results">
        {hits.map((hit) => (
          <Result key={hit.doc.id} hit={hit} query={query} />
        ))}
      </ul>

      {hits.length === 0 ? (
        <p className="room-search-none">
          Nothing matches. The index covers document titles, descriptions, topics and planned
          contents — the documents themselves are still being written, so their text is not
          searchable yet.
        </p>
      ) : null}
    </div>
  );
}

function Result({ hit, query }: { hit: Hit; query: string }) {
  const section = findSection(hit.doc.section);
  return (
    <li className="room-result">
      <Link href={`/data-room/document/${hit.doc.id}`}>
        <span className="result-top">
          <span className="result-where">
            {section?.index} — {section?.title}
          </span>
          <Status status={hit.doc.status} />
        </span>

        <span className="result-title">{hit.doc.title}</span>

        <span className="result-snippet">
          <i className="result-field">{hit.field}</i>
          {highlight(hit.snippet, query).map((part, i) =>
            part.hit ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>,
          )}
        </span>

        <span className="result-topics">
          {hit.doc.topics.map((topic) => (
            <i key={topic}>{topic}</i>
          ))}
        </span>
      </Link>
    </li>
  );
}

function Filter({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value?: string;
  options: Array<[string, string]>;
  onPick: (value: string | undefined) => void;
}) {
  return (
    <label className="room-filter">
      <span>{label}</span>
      <select
        value={value ?? ''}
        onChange={(event) => onPick(event.target.value || undefined)}
      >
        <option value="">Any</option>
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

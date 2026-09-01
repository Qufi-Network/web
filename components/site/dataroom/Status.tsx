import { STATUS_LABEL, type DocStatus } from './catalogue';

/**
 * How far along a document is, said plainly.
 *
 * The library is being assembled, and a reader who cannot tell a finished
 * document from a planned one has to open everything to find out. The chip is
 * on the card, on the detail page and in the search results for that reason:
 * it is the first thing worth knowing about any document here.
 */
export function Status({ status, className = '' }: { status: DocStatus; className?: string }) {
  return (
    <span className={`status status-${status} ${className}`.trim()} data-status={status}>
      <i aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

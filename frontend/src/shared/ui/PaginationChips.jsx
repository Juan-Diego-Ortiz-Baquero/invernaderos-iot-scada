function buildPageWindow(currentPage, totalPages) {
  const windowSize = totalPages <= 7 ? totalPages : 5;
  const halfWindow = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - halfWindow);
  let end = Math.min(totalPages, start + windowSize - 1);

  start = Math.max(1, end - windowSize + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function PaginationChips({ currentPage, disabled = false, onPageChange, totalPages }) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const visiblePages = buildPageWindow(currentPage, safeTotalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < safeTotalPages;

  return (
    <div className="analytics-pagination" aria-label="Paginacion">
      <button
        className="small-button"
        disabled={!hasPrevious || disabled}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Anterior
      </button>

      {visiblePages[0] > 1 ? (
        <>
          <button className="page-chip" disabled={disabled} onClick={() => onPageChange(1)} type="button">
            1
          </button>
          {visiblePages[0] > 2 ? <span className="page-ellipsis">...</span> : null}
        </>
      ) : null}

      {visiblePages.map((page) => (
        <button
          aria-current={page === currentPage ? 'page' : undefined}
          className={page === currentPage ? 'page-chip page-chip--active' : 'page-chip'}
          disabled={disabled}
          key={page}
          onClick={() => onPageChange(page)}
          type="button"
        >
          {page}
        </button>
      ))}

      {visiblePages[visiblePages.length - 1] < safeTotalPages ? (
        <>
          {visiblePages[visiblePages.length - 1] < safeTotalPages - 1 ? <span className="page-ellipsis">...</span> : null}
          <button className="page-chip" disabled={disabled} onClick={() => onPageChange(safeTotalPages)} type="button">
            {safeTotalPages}
          </button>
        </>
      ) : null}

      <button
        className="small-button"
        disabled={!hasNext || disabled}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Siguiente
      </button>
    </div>
  );
}

"""Small reusable helper functions."""
from datetime import date, datetime


def parse_iso_date(value: str | None) -> date | None:
    """Parse an 'YYYY-MM-DD' string into a date object, or return None."""
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def paginate_query(query, page: int = 1, per_page: int = 20, max_per_page: int = 100):
    """Apply consistent pagination to a SQLAlchemy query and return
    (items, pagination_meta).
    """
    per_page = min(per_page, max_per_page)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    meta = {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }
    return pagination.items, meta

"""
audit.py -- Central audit logging helper for OrthoPAR.

Usage:
    from fastapi import Request
    import audit

    audit.record(db, audit.PATIENT_CREATED,
                 user_id=current_user.id,
                 user_email=current_user.email,
                 entity_type="patient",
                 entity_id=str(db_patient.id),
                 summary="Patient created: John Smith",
                 details={"patient_id": "...", "name": "John Smith"},
                 request=request)

Design notes:
  - Fire-and-forget: exceptions are swallowed so audit failures never
    interrupt a clinical operation.
  - details is stored as JSONB -- no json.dumps() needed; PostgreSQL
    can query it server-side: WHERE details->>"patient_id" = "15"
  - All timestamps are timezone-aware UTC (datetime.now(timezone.utc)).
  - status uses AuditStatus enum -- no raw strings at call sites.
  - request metadata (IP, User-Agent, method, endpoint) is extracted
    automatically when a FastAPI Request object is passed.
"""

from datetime import datetime, timezone
from fastapi import Request
from sqlalchemy.orm import Session
import models
from models import AuditStatus


# ---------------------------------------------------------------------------
# Action constants -- ALL_CAPS_UNDERSCORE convention
# ---------------------------------------------------------------------------

# Auth
USER_REGISTERED  = "USER_REGISTERED"
LOGIN_SUCCESS    = "LOGIN_SUCCESS"
LOGIN_FAILURE    = "LOGIN_FAILURE"
PROFILE_UPDATED  = "PROFILE_UPDATED"
PASSWORD_CHANGED = "PASSWORD_CHANGED"
MODEL_UPLOADED   = "MODEL_UPLOADED"
MODEL_UPLOAD_FAILED = "MODEL_UPLOAD_FAILED"

# Clinical lifecycle -- success variants
PATIENT_CREATED      = "PATIENT_CREATED"
VISIT_CREATED        = "VISIT_CREATED"
SCAN_UPLOADED        = "SCAN_UPLOADED"
LANDMARK_EXTRACTED   = "LANDMARK_EXTRACTED"
PAR_SCORE_CALCULATED = "PAR_SCORE_CALCULATED"
MANUAL_SCORE_SAVED   = "MANUAL_SCORE_SAVED"
REPORT_VIEWED        = "REPORT_VIEWED"

# Clinical lifecycle -- failure variants
SCAN_UPLOAD_FAILED          = "SCAN_UPLOAD_FAILED"
LANDMARK_EXTRACTION_FAILED  = "LANDMARK_EXTRACTION_FAILED"
PAR_SCORE_FAILED            = "PAR_SCORE_FAILED"

# Admin & account management
USER_APPROVED           = "USER_APPROVED"
USER_REJECTED           = "USER_REJECTED"
USER_DISABLED           = "USER_DISABLED"
ROLE_CHANGED            = "ROLE_CHANGED"
ADMIN_LOGIN             = "ADMIN_LOGIN"
SECURITY_ALERT_CREATED  = "SECURITY_ALERT_CREATED"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_request_meta(request: Request | None) -> dict:
    """Pull IP, User-Agent, HTTP method, and endpoint from a FastAPI Request."""
    if request is None:
        return {}
    # X-Forwarded-For is set by reverse proxies (nginx, load balancers).
    # Fall back to the direct connection IP when it is absent.
    forwarded_for = request.headers.get("x-forwarded-for")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else (
        request.client.host if request.client else None
    )
    return {
        "ip_address":  ip,
        "user_agent":  request.headers.get("user-agent"),
        "http_method": request.method,
        "endpoint":    str(request.url.path),
    }


# ---------------------------------------------------------------------------
# Core helper
# ---------------------------------------------------------------------------

def record(
    db: Session,
    action: str,
    *,
    user_id=None,
    user_email=None,
    entity_type=None,
    entity_id=None,
    summary: str | None = None,
    details: dict | None = None,
    status: AuditStatus = AuditStatus.SUCCESS,
    request: Request | None = None,
    # Legacy/manual overrides -- prefer passing request= instead
    ip_address: str | None = None,
    user_agent: str | None = None,
    http_method: str | None = None,
    endpoint: str | None = None,
) -> None:
    """
    Write one audit entry to the audit_logs table.

    Never raises -- a log failure must not interrupt a clinical workflow.
    On failure the exception is printed to stdout and the DB transaction
    is rolled back so it cannot poison the caller's session.

    Args:
        db:          Active SQLAlchemy session.
        action:      Action constant (e.g. audit.PATIENT_CREATED).
        user_id:     Integer PK of the acting user.
        user_email:  Email of the acting user (denormalised for fast reads).
        entity_type: Type of the affected entity ("patient", "scan", ...).
        entity_id:   String ID of the affected entity.
        summary:     Human-readable one-liner for the audit UI.
        details:     Dict payload stored as JSONB (queryable server-side).
        status:      AuditStatus.SUCCESS or AuditStatus.FAILURE.
        request:     FastAPI Request object; extracts IP, UA, method, path.
    """
    try:
        meta = _extract_request_meta(request)
        entry = models.AuditLog(
            timestamp   = datetime.now(timezone.utc),
            user_id     = user_id,
            user_email  = user_email,
            action      = action,
            entity_type = entity_type,
            entity_id   = str(entity_id) if entity_id is not None else None,
            summary     = summary,
            details     = details,          # dict goes straight to JSONB
            status      = status,
            ip_address  = meta.get("ip_address")  or ip_address,
            user_agent  = meta.get("user_agent")   or user_agent,
            http_method = meta.get("http_method")  or http_method,
            endpoint    = meta.get("endpoint")     or endpoint,
        )
        db.add(entry)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[AUDIT] Failed to write audit entry (action={action}): {exc}")

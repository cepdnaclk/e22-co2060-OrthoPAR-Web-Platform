"""
admin.py — Admin-only API routes for OrthoPAR.

All routes are protected by auth.require_admin which verifies:
  1. A valid JWT token exists.
  2. The user's account_status is APPROVED.
  3. The user's role is ADMIN.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone, timedelta

import models, schemas, auth, audit
from database import get_db

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---------------------------------------------------------------------------
# Helper: build user summary with action count
# ---------------------------------------------------------------------------

def _build_user_summary(user: models.User, db: Session) -> schemas.UserAdminSummary:
    action_count = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == user.id
    ).count()
    summary = schemas.UserAdminSummary.model_validate(user)
    summary.action_count = action_count
    return summary


# ---------------------------------------------------------------------------
# Stats endpoint
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=schemas.AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """System-wide counts for the admin overview dashboard."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = now - timedelta(hours=24)

    total_users     = db.query(models.User).count()
    pending_users   = db.query(models.User).filter(models.User.account_status == "pending").count()
    approved_users  = db.query(models.User).filter(models.User.account_status == "approved").count()
    rejected_users  = db.query(models.User).filter(models.User.account_status == "rejected").count()
    disabled_users  = db.query(models.User).filter(models.User.account_status == "disabled").count()
    total_events    = db.query(models.AuditLog).count()
    failed_logins   = db.query(models.AuditLog).filter(
        models.AuditLog.action == audit.LOGIN_FAILURE,
        models.AuditLog.timestamp >= yesterday,
    ).count()
    approved_today  = db.query(models.User).filter(
        models.User.approved_at >= today_start
    ).count()

    return schemas.AdminStatsResponse(
        total_users=total_users,
        pending_users=pending_users,
        approved_users=approved_users,
        rejected_users=rejected_users,
        disabled_users=disabled_users,
        total_audit_events=total_events,
        failed_logins_24h=failed_logins,
        approved_today=approved_today,
    )


# ---------------------------------------------------------------------------
# User management endpoints
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[schemas.UserAdminSummary])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Return all registered users with action counts."""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return [_build_user_summary(u, db) for u in users]


@router.get("/users/pending", response_model=List[schemas.UserAdminSummary])
def get_pending_users(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Return all users with PENDING account status."""
    users = db.query(models.User).filter(
        models.User.account_status == models.AccountStatus.PENDING
    ).order_by(models.User.created_at.asc()).all()
    return [_build_user_summary(u, db) for u in users]


@router.get("/users/{user_id}", response_model=schemas.UserAdminSummary)
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _build_user_summary(user, db)


@router.post("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    body: schemas.UserApprovalAction,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.require_admin),
):
    """Approve a pending user account."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.account_status == models.AccountStatus.APPROVED:
        raise HTTPException(status_code=400, detail="User is already approved")

    user.account_status = models.AccountStatus.APPROVED
    user.approved_by = admin.id
    user.approved_at = datetime.now(timezone.utc)
    db.commit()

    audit.record(
        db, audit.USER_APPROVED,
        user_id=admin.id,
        user_email=admin.email,
        entity_type="user",
        entity_id=str(user.id),
        summary=f"User approved: {user.email} by {admin.email}",
        details={"target_user_id": user.id, "target_email": user.email, "reason": body.reason},
        request=request,
    )
    return {"message": f"User {user.email} approved successfully"}


@router.post("/users/{user_id}/reject")
def reject_user(
    user_id: int,
    body: schemas.UserApprovalAction,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.require_admin),
):
    """Reject a pending user account."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.account_status = models.AccountStatus.REJECTED
    db.commit()

    audit.record(
        db, audit.USER_REJECTED,
        user_id=admin.id,
        user_email=admin.email,
        entity_type="user",
        entity_id=str(user.id),
        summary=f"User rejected: {user.email} by {admin.email}",
        details={"target_user_id": user.id, "target_email": user.email, "reason": body.reason},
        request=request,
    )
    return {"message": f"User {user.email} rejected"}


@router.post("/users/{user_id}/disable")
def disable_user(
    user_id: int,
    body: schemas.UserApprovalAction,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.require_admin),
):
    """Disable an active user account."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == models.UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot disable another admin account")

    user.account_status = models.AccountStatus.DISABLED
    db.commit()

    audit.record(
        db, audit.USER_DISABLED,
        user_id=admin.id,
        user_email=admin.email,
        entity_type="user",
        entity_id=str(user.id),
        summary=f"User disabled: {user.email} by {admin.email}",
        details={"target_user_id": user.id, "target_email": user.email, "reason": body.reason},
        request=request,
    )
    return {"message": f"User {user.email} disabled"}


@router.put("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    body: schemas.RoleChangeAction,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.require_admin),
):
    """Change a user's role between clinician and admin."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.new_role not in [models.UserRole.ADMIN, models.UserRole.CLINICIAN]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'clinician'")

    old_role = user.role
    user.role = body.new_role
    db.commit()

    audit.record(
        db, audit.ROLE_CHANGED,
        user_id=admin.id,
        user_email=admin.email,
        entity_type="user",
        entity_id=str(user.id),
        summary=f"Role changed: {user.email} from {old_role} to {body.new_role}",
        details={
            "target_user_id": user.id,
            "target_email": user.email,
            "old_role": old_role,
            "new_role": body.new_role,
            "reason": body.reason,
        },
        request=request,
    )
    return {"message": f"User {user.email} role changed to {body.new_role}"}


# ---------------------------------------------------------------------------
# Admin Audit Trail — all users
# ---------------------------------------------------------------------------

@router.get("/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_all_audit_logs(
    user_email: Optional[str] = None,
    action: Optional[str] = None,
    log_status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """
    Returns audit log entries for ALL users (admin view).
    Filterable by user_email, action, status, and date range.
    """
    query = db.query(models.AuditLog)
    if user_email:
        query = query.filter(models.AuditLog.user_email.ilike(f"%{user_email}%"))
    if action:
        query = query.filter(models.AuditLog.action.ilike(f"%{action}%"))
    if log_status:
        query = query.filter(models.AuditLog.status == log_status)
    if from_date:
        query = query.filter(models.AuditLog.timestamp >= from_date)
    if to_date:
        query = query.filter(models.AuditLog.timestamp <= to_date)

    return (
        query
        .order_by(models.AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


# ---------------------------------------------------------------------------
# Security Monitoring
# ---------------------------------------------------------------------------

@router.get("/security-events", response_model=List[schemas.SecurityEventResponse])
def get_security_events(
    hours: int = 24,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """
    Aggregates failed login attempts over the last N hours.
    Groups by (user_email, ip_address) and returns counts.
    Accounts with >= 3 failures are a security concern.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    rows = (
        db.query(
            models.AuditLog.user_email,
            models.AuditLog.ip_address,
            func.count(models.AuditLog.id).label("failure_count"),
            func.max(models.AuditLog.timestamp).label("last_attempt"),
        )
        .filter(
            models.AuditLog.action == audit.LOGIN_FAILURE,
            models.AuditLog.timestamp >= since,
        )
        .group_by(models.AuditLog.user_email, models.AuditLog.ip_address)
        .order_by(func.count(models.AuditLog.id).desc())
        .all()
    )

    return [
        schemas.SecurityEventResponse(
            email=r.user_email or "unknown",
            ip_address=r.ip_address,
            failure_count=r.failure_count,
            last_attempt=r.last_attempt,
        )
        for r in rows
    ]


@router.get("/security-events/recent", response_model=List[schemas.AuditLogResponse])
def get_recent_security_events(
    limit: int = 20,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(auth.require_admin),
):
    """Recent security-related audit events (failures + alerts)."""
    return (
        db.query(models.AuditLog)
        .filter(models.AuditLog.status == "failure")
        .order_by(models.AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )

from datetime import date

from app.models.component import Component
from app.models.service_interval import IntervalType
from app.schemas.due import ComponentDueResponse, DueStatus
from app.schemas.interval import ServiceIntervalResponse


def check_component(
    component: Component,
    bike_total_km: float,
    today: date,
) -> ComponentDueResponse | None:
    """
    Evaluate a single component against its service interval.

    Returns a ComponentDueResponse if the component needs attention
    (overdue / due_soon / needs_first_service), or None if it is OK
    or has no interval configured.
    """
    interval = component.service_interval
    if not interval:
        return None

    # Most-recent log (sort in Python — relationship has no guaranteed order)
    last_log = (
        max(component.maintenance_logs, key=lambda lg: lg.performed_at)
        if component.maintenance_logs
        else None
    )

    if not last_log:
        return ComponentDueResponse(
            id=component.id,
            name=component.name,
            category=component.category,
            status=DueStatus.needs_first_service,
            days_since_service=None,
            days_until_due=None,
            km_since_service=None,
            km_until_due=None,
            service_interval=ServiceIntervalResponse.model_validate(interval),
        )

    days_since = (today - last_log.performed_at).days
    km_since = bike_total_km - last_log.odometer_km

    time_overdue = time_due_soon = False
    dist_overdue = dist_due_soon = False
    days_until_due: int | None = None
    km_until_due: float | None = None

    if interval.interval_type in (IntervalType.time, IntervalType.both):
        days_until_due = interval.interval_days - days_since  # negative when overdue
        if days_since >= interval.interval_days:
            time_overdue = True
        elif days_since >= interval.interval_days - interval.reminder_days_before:
            time_due_soon = True

    if interval.interval_type in (IntervalType.distance, IntervalType.both):
        reminder_threshold_km = interval.interval_km * 0.10  # 10 % of interval
        km_until_due = interval.interval_km - km_since        # negative when overdue
        if km_since >= interval.interval_km:
            dist_overdue = True
        elif km_since >= interval.interval_km - reminder_threshold_km:
            dist_due_soon = True

    if time_overdue or dist_overdue:
        status = DueStatus.overdue
    elif time_due_soon or dist_due_soon:
        status = DueStatus.due_soon
    else:
        return None  # component is comfortably within interval

    return ComponentDueResponse(
        id=component.id,
        name=component.name,
        category=component.category,
        status=status,
        days_since_service=days_since,
        days_until_due=days_until_due,
        km_since_service=round(km_since, 1),
        km_until_due=round(km_until_due, 1) if km_until_due is not None else None,
        service_interval=ServiceIntervalResponse.model_validate(interval),
    )


def get_due_components(
    components: list[Component],
    bike_total_km: float,
    today: date,
) -> list[ComponentDueResponse]:
    """Return all actionable components, sorted overdue → due_soon → needs_first_service."""
    from app.schemas.due import DUE_STATUS_ORDER

    results = [
        result
        for component in components
        if (result := check_component(component, bike_total_km, today)) is not None
    ]
    results.sort(key=lambda r: DUE_STATUS_ORDER[r.status])
    return results

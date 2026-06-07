"""
PDF export service — generates a tamper-evident maintenance protocol for a bike.

Uses ReportLab (installed via the `reportlab` package).

Entry point:  generate_pdf(bike, components, owner_name) → bytes
"""
from __future__ import annotations

import io
from datetime import date, datetime
from typing import Sequence

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus import (
    Image as RLImage,
)

# ── Page geometry ─────────────────────────────────────────────────────────────

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

# ── Colours ───────────────────────────────────────────────────────────────────

BLACK = colors.black
GREY = colors.HexColor("#555555")
LIGHT_GREY = colors.HexColor("#dddddd")
ACCENT = colors.HexColor("#1a56db")

# ── Styles ────────────────────────────────────────────────────────────────────

_base = getSampleStyleSheet()

S_TITLE = ParagraphStyle("Title", parent=_base["Normal"],
                          fontSize=26, fontName="Helvetica-Bold",
                          leading=30, textColor=BLACK)
S_SUBTITLE = ParagraphStyle("Subtitle", parent=_base["Normal"],
                             fontSize=13, fontName="Helvetica",
                             leading=18, textColor=GREY)
S_HEADING = ParagraphStyle("Heading", parent=_base["Normal"],
                            fontSize=11, fontName="Helvetica-Bold",
                            leading=14, textColor=BLACK)
S_BODY = ParagraphStyle("Body", parent=_base["Normal"],
                         fontSize=9, fontName="Helvetica",
                         leading=13, textColor=BLACK)
S_CAPTION = ParagraphStyle("Caption", parent=_base["Normal"],
                            fontSize=8, fontName="Helvetica",
                            leading=11, textColor=GREY)
S_MONO = ParagraphStyle("Mono", parent=_base["Normal"],
                         fontSize=8, fontName="Courier",
                         leading=11, textColor=GREY)
S_IMMUTABLE = ParagraphStyle("Immutable", parent=_base["Normal"],
                              fontSize=8, fontName="Helvetica-Oblique",
                              leading=12, textColor=GREY, alignment=TA_CENTER)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_date(d: date | None) -> str:
    if d is None:
        return "—"
    if isinstance(d, str):
        try:
            d = date.fromisoformat(d)
        except ValueError:
            return d
    return d.strftime("%d.%m.%Y")


def _fmt_dt(dt: datetime | None) -> str:
    if dt is None:
        return "—"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError:
            return dt
    return dt.strftime("%d.%m.%Y %H:%M UTC")


# ── Document builder ──────────────────────────────────────────────────────────

class _FooterCanvas:
    """Mixin applied to the canvas on each page to draw footer + page number."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._export_date: str = ""

    def showPage(self):
        self._draw_footer()
        super().showPage()

    def save(self):
        self._draw_footer()
        super().save()

    def _draw_footer(self):
        self.saveState()
        y = MARGIN / 2
        txt = f"Exportiert aus Upkeep am {self._export_date}  |  Seite {self._pageNumber}"
        self.setFont("Helvetica", 7)
        self.setFillColor(GREY)
        self.drawCentredString(PAGE_W / 2, y, txt)
        self.setStrokeColor(LIGHT_GREY)
        self.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6)
        self.restoreState()


from reportlab.pdfgen.canvas import Canvas as _BaseCanvas


class _UpkeepCanvas(_FooterCanvas, _BaseCanvas):  # type: ignore[misc]
    pass


# ── Public entry point ────────────────────────────────────────────────────────

def generate_pdf(
    bike,
    components: Sequence,
    owner_name: str,
    component_ids: list[str] | None = None,
) -> bytes:
    """
    Return the PDF as *bytes*.

    :param bike:           SQLAlchemy ``Bike`` object (with ``.components`` loaded).
    :param components:     Sequence of ``Component`` objects (each with
                           ``.maintenance_logs``, ``.service_interval``,
                           ``log.photos``, ``log.comments`` loaded).
    :param owner_name:     Display name of the owner.
    :param component_ids:  Optional allowlist of component UUIDs (as strings).
                           Pass ``None`` to include all.
    """
    buf = io.BytesIO()
    export_date = date.today().strftime("%d.%m.%Y")

    # Filter components if requested
    if component_ids:
        id_set = set(str(cid) for cid in component_ids)
        components = [c for c in components if str(c.id) in id_set]

    # ── Document setup ────────────────────────────────────────────────────────
    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN * 1.5,
        title=f"Upkeep – {bike.name}",
        author="Upkeep",
    )

    content_frame = Frame(
        MARGIN, MARGIN * 1.5,
        PAGE_W - 2 * MARGIN, PAGE_H - MARGIN - MARGIN * 1.5,
        id="main",
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=content_frame)])

    story: list = []

    # ── Cover page ────────────────────────────────────────────────────────────
    story += [
        Spacer(1, 20 * mm),
        Paragraph("Upkeep", S_TITLE),
        Paragraph("Wartungsprotokoll", S_SUBTITLE),
        Spacer(1, 6 * mm),
        HRFlowable(width="100%", thickness=1, color=ACCENT),
        Spacer(1, 6 * mm),
        _kv_table([
            ("Bike",        bike.name),
            ("Marke",       bike.brand or "—"),
            ("Modell",      bike.model or "—"),
            ("Baujahr",     str(bike.year) if bike.year else "—"),
            ("km-Stand",    f"{bike.total_km:,.0f} km"),
            ("Besitzer",    owner_name),
            ("Exportdatum", export_date),
        ]),
        Spacer(1, 8 * mm),
        Paragraph(
            "Dieses Dokument ist ein Append-Only-Protokoll. Einträge können nach der "
            "Erfassung nicht mehr geändert oder gelöscht werden.",
            S_IMMUTABLE,
        ),
        PageBreak(),
    ]

    # ── Per-component sections ────────────────────────────────────────────────
    for comp in components:
        story += _component_section(comp)

    # ── Build PDF ─────────────────────────────────────────────────────────────
    def canvas_maker(filename, **kwargs):
        c = _UpkeepCanvas(filename, **kwargs)
        c._export_date = export_date
        return c

    doc.build(story, canvasmaker=canvas_maker)
    return buf.getvalue()


# ── Story helpers ─────────────────────────────────────────────────────────────

def _kv_table(rows: list[tuple[str, str]]):
    data = [[Paragraph(k, S_CAPTION), Paragraph(v, S_BODY)] for k, v in rows]
    tbl = Table(data, colWidths=[45 * mm, None])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    return tbl


_CATEGORY_LABELS = {
    "brakes": "Bremsen",
    "drivetrain": "Antrieb",
    "wheels": "Räder",
    "suspension": "Federung",
    "other": "Sonstige",
}


def _component_section(comp) -> list:
    elems: list = []

    cat = _CATEGORY_LABELS.get(str(comp.category.value if hasattr(comp.category, "value") else comp.category), "—")
    elems.append(Paragraph(comp.name, S_HEADING))
    elems.append(Paragraph(cat, S_CAPTION))
    elems.append(Spacer(1, 2 * mm))

    info_rows = []
    if comp.installed_at:
        info_rows.append(("Eingebaut am", _fmt_date(comp.installed_at)))
    if comp.installed_km is not None:
        info_rows.append(("km bei Einbau", f"{comp.installed_km:,.0f} km"))
    if comp.notes:
        info_rows.append(("Notizen", comp.notes))
    if info_rows:
        elems.append(_kv_table(info_rows))
        elems.append(Spacer(1, 2 * mm))

    logs = sorted(comp.maintenance_logs, key=lambda lg: lg.performed_at)
    if not logs:
        elems.append(Paragraph("Keine Wartungseinträge vorhanden.", S_CAPTION))
    else:
        for log in logs:
            elems += _log_section(log)

    elems.append(HRFlowable(width="100%", thickness=0.5, color=LIGHT_GREY))
    elems.append(Spacer(1, 4 * mm))
    return elems


def _log_section(log) -> list:
    elems: list = [Spacer(1, 2 * mm)]

    # Header row: performed_at + recorded_at + cost
    header_data = [
        Paragraph(_fmt_date(log.performed_at), S_BODY),
        Paragraph(f"Erfasst: {_fmt_dt(log.recorded_at)}", S_MONO),
    ]
    if log.cost is not None:
        header_data.append(Paragraph(f"{log.cost:.2f} €", S_BODY))

    # Description
    elems.append(Paragraph(log.description, S_BODY))
    elems.append(Paragraph(
        f"Datum: {_fmt_date(log.performed_at)}   ·   "
        f"km-Stand: {log.odometer_km:,.0f}   ·   "
        f"Erfasst: {_fmt_dt(log.recorded_at)}"
        + (f"   ·   {log.cost:.2f} €" if log.cost else ""),
        S_MONO,
    ))
    elems.append(Spacer(1, 1 * mm))

    # Thumbnails (max 3 per row)
    photos = list(log.photos) if hasattr(log, "photos") else []
    if photos:
        row_data = []
        row_captions = []
        for i, photo in enumerate(photos[:9]):  # cap at 9
            try:
                img = RLImage(photo.thumbnail_path, width=40 * mm, height=40 * mm)
                img.hAlign = "LEFT"
                row_data.append(img)
                row_captions.append(Paragraph(photo.caption or "", S_CAPTION))
            except Exception:
                pass
            if len(row_data) == 3 or i == len(photos) - 1:
                # Pad to 3 columns
                while len(row_data) < 3:
                    row_data.append("")
                    row_captions.append("")
                tbl = Table(
                    [row_data, row_captions],
                    colWidths=[44 * mm, 44 * mm, 44 * mm],
                )
                tbl.setStyle(TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]))
                elems.append(tbl)
                row_data = []
                row_captions = []

    # Comments
    comments = list(log.comments) if hasattr(log, "comments") else []
    if comments:
        elems.append(Paragraph("Kommentare:", S_CAPTION))
        for comment in comments:
            elems.append(Paragraph(
                f"<i>{_fmt_dt(comment.created_at)}</i>  {comment.text}",
                S_BODY,
            ))

    elems.append(Spacer(1, 2 * mm))
    return elems

import { blue, gray, navy, status } from '@/theme/palette';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

// Pure-JS PDF rendering (pdf-lib), so reports work on native and web without
// a native module or a dev-client rebuild. The built-in Helvetica faces only
// cover WinAnsi (Latin-1), so every string goes through `sanitize` first —
// pdf-lib throws on characters outside that set.

type Color = ReturnType<typeof rgb>;

export interface ReportColumn {
  header: string;
  /** Fraction of the content width; a table's widths should sum to 1. */
  width: number;
}

export interface ReportTable {
  columns: ReportColumn[];
  rows: string[][];
  emptyText: string;
  /** Column whose values (Active, Revoked, Pending…) are tinted by status. */
  statusColumn?: number;
}

export interface ReportSection {
  title: string;
  note?: string;
  table: ReportTable;
}

export interface ReportDefinition {
  title: string;
  subtitle: string;
  meta: [label: string, value: string][];
  stats: { label: string; value: number }[];
  sections: ReportSection[];
  footer: string;
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_BOTTOM = 60; // keeps content clear of the footer
const TABLE_HEADER_HEIGHT = 22;
const TABLE_ROW_HEIGHT = 20;
const CELL_PADDING = 6;

function hex(value: string): Color {
  const n = parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const COLORS = {
  band: hex(navy[900]),
  accent: hex(blue[500]),
  accentLight: hex(blue[400]),
  bandSubtle: hex(gray[300]),
  white: hex(gray[0]),
  text: hex(navy[900]),
  textSecondary: hex(gray[600]),
  textMuted: hex(gray[500]),
  border: hex(gray[200]),
  surfaceAlt: hex(gray[100]),
  surfaceSubtle: hex(gray[50]),
};

const STATUS_TONES: Record<string, Color> = {
  active: hex(status.success),
  approved: hex(status.success),
  valid: hex(status.success),
  revoked: hex(status.danger),
  rejected: hex(status.danger),
  invalid: hex(status.danger),
  'not found': hex(status.danger),
  pending: hex(status.warning),
  suspended: hex(status.warning),
};

const REPLACEMENTS: [RegExp, string][] = [
  [/[\t\r\n]+/g, ' '],
  [/[ -​  　]/g, ' '], // e.g. the narrow no-break space Intl puts in times
  [/[‘’‚′]/g, "'"],
  [/[“”„″]/g, '"'],
  [/[‐-―−]/g, '-'],
  [/…/g, '...'],
];

function isWinAnsiSafe(code: number): boolean {
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
}

function sanitize(input: string): string {
  let text = input;
  for (const [pattern, replacement] of REPLACEMENTS) text = text.replace(pattern, replacement);

  let out = '';
  for (const char of text) {
    if (isWinAnsiSafe(char.codePointAt(0)!)) {
      out += char;
      continue;
    }
    // Fall back to the unaccented letter (ł → l, ş → s) before giving up.
    let base = '';
    try {
      base = char.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    } catch {
      // normalize() unavailable — use the placeholder below.
    }
    out += base && [...base].every((c) => isWinAnsiSafe(c.codePointAt(0)!)) ? base : '?';
  }
  return out;
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && font.widthOfTextAtSize(`${text.slice(0, end)}...`, size) > maxWidth) end--;
  return `${text.slice(0, end).trimEnd()}...`;
}

class ReportWriter {
  private doc: PDFDocument;
  private regular: PDFFont;
  private bold: PDFFont;
  private page!: PDFPage;
  private y = 0;

  constructor(doc: PDFDocument, regular: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;
    this.newPage();
  }

  private newPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  /** Starts a new page if `height` doesn't fit; returns whether it did. */
  private ensureSpace(height: number): boolean {
    if (this.y - height >= CONTENT_BOTTOM) return false;
    this.newPage();
    return true;
  }

  private text(
    value: string,
    x: number,
    y: number,
    size: number,
    options: { font?: PDFFont; color?: Color; maxWidth?: number } = {},
  ) {
    const font = options.font ?? this.regular;
    let clean = sanitize(value);
    if (options.maxWidth !== undefined) clean = fit(clean, font, size, options.maxWidth);
    this.page.drawText(clean, { x, y, size, font, color: options.color ?? COLORS.text });
  }

  header(title: string, subtitle: string) {
    const bandHeight = 112;
    this.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - bandHeight, width: PAGE_WIDTH, height: bandHeight, color: COLORS.band });
    this.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - bandHeight, width: PAGE_WIDTH, height: 4, color: COLORS.accent });
    this.text('TASDIKIDOCS', MARGIN, PAGE_HEIGHT - 38, 9, { font: this.bold, color: COLORS.accentLight });
    this.text(title, MARGIN, PAGE_HEIGHT - 68, 22, { font: this.bold, color: COLORS.white, maxWidth: CONTENT_WIDTH });
    this.text(subtitle, MARGIN, PAGE_HEIGHT - 90, 11, { color: COLORS.bandSubtle, maxWidth: CONTENT_WIDTH });
    this.y = PAGE_HEIGHT - bandHeight - 28;
  }

  meta(items: ReportDefinition['meta']) {
    const columnWidth = CONTENT_WIDTH / 2;
    const rowHeight = 32;
    items.forEach(([label, value], index) => {
      const x = MARGIN + (index % 2) * columnWidth;
      const top = this.y - Math.floor(index / 2) * rowHeight;
      this.text(label.toUpperCase(), x, top - 8, 7.5, { font: this.bold, color: COLORS.textMuted, maxWidth: columnWidth - 12 });
      this.text(value, x, top - 22, 10, { maxWidth: columnWidth - 12 });
    });
    this.y -= Math.ceil(items.length / 2) * rowHeight + 12;
  }

  stats(stats: ReportDefinition['stats']) {
    if (stats.length === 0) return;
    const perRow = stats.length === 4 ? 4 : 3;
    const gap = 10;
    const boxHeight = 60;
    const boxWidth = (CONTENT_WIDTH - gap * (perRow - 1)) / perRow;
    const rows = Math.ceil(stats.length / perRow);

    this.ensureSpace(rows * (boxHeight + gap));
    stats.forEach((stat, index) => {
      const x = MARGIN + (index % perRow) * (boxWidth + gap);
      const top = this.y - Math.floor(index / perRow) * (boxHeight + gap);
      this.page.drawRectangle({
        x,
        y: top - boxHeight,
        width: boxWidth,
        height: boxHeight,
        color: COLORS.surfaceSubtle,
        borderColor: COLORS.border,
        borderWidth: 0.75,
      });
      this.text(stat.value.toLocaleString(), x + 12, top - 30, 18, { font: this.bold, maxWidth: boxWidth - 24 });
      this.text(stat.label, x + 12, top - 47, 8.5, { color: COLORS.textSecondary, maxWidth: boxWidth - 24 });
    });
    this.y -= rows * (boxHeight + gap) + 10;
  }

  section({ title, note, table }: ReportSection) {
    // Keep the heading on the same page as the table header and first row.
    this.ensureSpace(34 + (note ? 18 : 0) + TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT);
    this.text(title, MARGIN, this.y - 14, 13, { font: this.bold, maxWidth: CONTENT_WIDTH });
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 22 },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y - 22 },
      thickness: 0.75,
      color: COLORS.border,
    });
    this.y -= 34;
    if (note) {
      this.text(note, MARGIN, this.y - 8, 8.5, { color: COLORS.textMuted, maxWidth: CONTENT_WIDTH });
      this.y -= 18;
    }
    this.table(table);
    this.y -= 22;
  }

  private table({ columns, rows, emptyText, statusColumn }: ReportTable) {
    const xs: number[] = [];
    columns.forEach((_, i) => xs.push(i === 0 ? MARGIN : xs[i - 1] + columns[i - 1].width * CONTENT_WIDTH));
    const cellWidth = (i: number) => columns[i].width * CONTENT_WIDTH - CELL_PADDING * 2;

    const drawHeader = () => {
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - TABLE_HEADER_HEIGHT,
        width: CONTENT_WIDTH,
        height: TABLE_HEADER_HEIGHT,
        color: COLORS.surfaceAlt,
      });
      columns.forEach((column, i) =>
        this.text(column.header.toUpperCase(), xs[i] + CELL_PADDING, this.y - 14.5, 7.5, {
          font: this.bold,
          color: COLORS.textSecondary,
          maxWidth: cellWidth(i),
        }),
      );
      this.y -= TABLE_HEADER_HEIGHT;
    };

    drawHeader();

    if (rows.length === 0) {
      this.text(emptyText, MARGIN + CELL_PADDING, this.y - 16, 9, { color: COLORS.textMuted, maxWidth: CONTENT_WIDTH });
      this.y -= 26;
      return;
    }

    rows.forEach((row, rowIndex) => {
      // Repeat the column header at the top of each continuation page.
      if (this.ensureSpace(TABLE_ROW_HEIGHT)) drawHeader();
      if (rowIndex % 2 === 1) {
        this.page.drawRectangle({
          x: MARGIN,
          y: this.y - TABLE_ROW_HEIGHT,
          width: CONTENT_WIDTH,
          height: TABLE_ROW_HEIGHT,
          color: COLORS.surfaceSubtle,
        });
      }
      row.forEach((cell, i) => {
        const tone = i === statusColumn ? STATUS_TONES[cell.toLowerCase()] : undefined;
        this.text(cell, xs[i] + CELL_PADDING, this.y - 13.5, 8.5, {
          font: tone ? this.bold : this.regular,
          color: tone ?? COLORS.text,
          maxWidth: cellWidth(i),
        });
      });
      this.y -= TABLE_ROW_HEIGHT;
    });

    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.5,
      color: COLORS.border,
    });
  }

  footer(label: string) {
    const pages = this.doc.getPages();
    pages.forEach((page, index) => {
      this.page = page;
      page.drawLine({
        start: { x: MARGIN, y: 40 },
        end: { x: PAGE_WIDTH - MARGIN, y: 40 },
        thickness: 0.5,
        color: COLORS.border,
      });
      this.text(label, MARGIN, 26, 8, { color: COLORS.textMuted, maxWidth: CONTENT_WIDTH - 90 });
      const pageLabel = `Page ${index + 1} of ${pages.length}`;
      const width = this.regular.widthOfTextAtSize(pageLabel, 8);
      this.text(pageLabel, PAGE_WIDTH - MARGIN - width, 26, 8, { color: COLORS.textMuted });
    });
  }
}

export async function renderReportPdf(report: ReportDefinition): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${report.title} - ${report.subtitle}`);
  doc.setAuthor('TasdikiDocs');
  doc.setCreator('TasdikiDocs');
  doc.setProducer('TasdikiDocs');
  doc.setCreationDate(new Date());

  const [regular, bold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);

  const writer = new ReportWriter(doc, regular, bold);
  writer.header(report.title, report.subtitle);
  writer.meta(report.meta);
  writer.stats(report.stats);
  report.sections.forEach((section) => writer.section(section));
  writer.footer(report.footer);

  return doc.save();
}

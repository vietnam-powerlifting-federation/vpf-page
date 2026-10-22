/** One column of a `ResultsTable`. */
export type TableColumn = {
  key: string
  /** Visible header text. */
  label: string
  /** Read by screen readers instead of `label` when the visible text is a symbol ("#"). */
  srLabel?: string
  /** Right-aligned, condensed tabular figures. */
  numeric?: boolean
  /** Header becomes a sort button; the table emits `sort` with this key. */
  sortable?: boolean
  /**
   * Stays on screen while the rest scrolls sideways: the rank column, then the
   * athlete column. "lead" pins a single first column (a records matrix's weight class).
   */
  pin?: "rank" | "name" | "lead"
  /** Cells are row headers (`<th scope="row">`), normally the athlete column. */
  rowHeader?: boolean
}

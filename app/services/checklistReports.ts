/** Reports still open for claim/transfer warnings and "tools with issues" counts. */
export function isOpenChecklistReport(report: { resolution_status?: string | null }) {
  return report.resolution_status !== 'resolved'
}

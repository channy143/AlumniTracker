export function isJobMatch(app: any, job: any): boolean {
  if (!app || !job) return false;
  const targetId = String(job.id || job.job_id || '').trim();
  if (targetId) {
    const candidateIds = [
      app.job_id,
      app.job?.id,
      app.job_postings?.id,
      app.job_posting_id,
      app.jobId,
      app.jobPostingId,
    ].filter(Boolean).map((id) => String(id).trim());
    if (candidateIds.includes(targetId)) return true;
  }
  // Fallback match on position & company if IDs are missing or synthetic
  const jobPos = (job.position || '').trim().toLowerCase();
  const jobComp = (job.company_name || '').trim().toLowerCase();
  const appPos = (app.job?.position || app.position || '').trim().toLowerCase();
  const appComp = (app.job?.company_name || app.company_name || '').trim().toLowerCase();
  if (jobPos && jobComp && appPos && appComp && jobPos === appPos && jobComp === appComp) {
    return true;
  }
  return false;
}

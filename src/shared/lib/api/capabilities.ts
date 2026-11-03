import { env } from '../env';

// What the real backend cannot do yet. Pages check this, so against the real backend they hide a
// feature rather than show something false. When a backend change lands, set its line to true.
const REAL_BACKEND_SUPPORTS = {
  /** BCR-05 POST /users/lookup. Built 2026-11-02 (UserService). Without it, people show as a short id. */
  userNames: true,
  /** BCR-06 status, severity and q on GET /incidents. Until then, the filters are hidden. */
  incidentFilters: false,
  /** BCR-07 POST /reports/sla/lookup. Until then, SLA badges are hidden. */
  slaData: false,
  /** BCR-08 audit for an incident's creator and assignee. Until then, engineers see no activity. */
  engineerActivity: false,
  /** BCR-09 POST /reports/engineer-summaries. Until then, Team shows no SLA or expertise numbers. */
  engineerSummaries: false,
  /** BCR-13 GET /reports/sla-policy. Until then, the report form shows no SLA preview. */
  slaPolicy: false,
};

export type BackendCapability = keyof typeof REAL_BACKEND_SUPPORTS;

/** Mock mode answers the proposed endpoints too, so the finished page can be seen. */
export function backendSupports(capability: BackendCapability): boolean {
  return env.apiMocking || REAL_BACKEND_SUPPORTS[capability];
}

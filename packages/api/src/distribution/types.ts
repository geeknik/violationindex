/** Data bundle passed to each artifact generator */
export interface ViolationBundle {
  violation: {
    id: string;
    site_domain: string;
    violation_type: string;
    severity: string;
    status: string;
    evidence_count: number;
    session_count: number;
    first_observed: string;
    last_observed: string;
    clock_started_at: string | null;
    response_deadline: string | null;
    resolved_at: string | null;
    estimated_users: number | null;
    estimated_exposure_min: number | null;
    estimated_exposure_max: number | null;
    created_at: string;
  };
  evidence: {
    id: string;
    site_domain: string;
    observed_url: string;
    observed_at: string;
    consent_state: string;
    request_type: string;
    request_destination: string;
    evidence_hash: string;
    gpc_active: number;
    consent_mechanism: string;
    cmp_name: string | null;
    tcf_consent_string: string | null;
  }[];
  policySnapshots: {
    id: string;
    site_domain: string;
    policy_url: string;
    content_hash: string;
    fetched_at: string;
    content_length: number;
  }[];
  auditTrail: {
    timestamp: string;
    action: string;
    actor: string;
    details: string | null;
    entry_hash: string;
  }[];
}

export type ArtifactType = 'dossier' | 'journalist_brief' | 'social_payload' | 'regulator_packet' | 'plaintiff_packet';

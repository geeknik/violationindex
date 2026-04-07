import { z } from 'zod';
export declare const consentStateSchema: z.ZodEnum<["pre_consent", "post_consent", "no_mechanism"]>;
export declare const requestTypeSchema: z.ZodEnum<["tracker", "marketing", "analytics"]>;
export declare const evidenceStatusSchema: z.ZodEnum<["unreviewed", "confirmed", "rejected", "disputed"]>;
export declare const evidenceSubmissionSchema: z.ZodObject<{
    siteDomain: z.ZodString;
    observedUrl: z.ZodString;
    observedAt: z.ZodString;
    consentState: z.ZodEnum<["pre_consent", "post_consent", "no_mechanism"]>;
    requestType: z.ZodEnum<["tracker", "marketing", "analytics"]>;
    requestDestination: z.ZodString;
    evidenceHash: z.ZodString;
    policySnapshotId: z.ZodNullable<z.ZodString>;
    sessionId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    siteDomain: string;
    observedUrl: string;
    observedAt: string;
    consentState: "pre_consent" | "post_consent" | "no_mechanism";
    requestType: "tracker" | "marketing" | "analytics";
    requestDestination: string;
    evidenceHash: string;
    policySnapshotId: string | null;
    sessionId: string;
}, {
    siteDomain: string;
    observedUrl: string;
    observedAt: string;
    consentState: "pre_consent" | "post_consent" | "no_mechanism";
    requestType: "tracker" | "marketing" | "analytics";
    requestDestination: string;
    evidenceHash: string;
    policySnapshotId: string | null;
    sessionId: string;
}>;
export declare const evidenceBatchSchema: z.ZodObject<{
    installationId: z.ZodString;
    records: z.ZodArray<z.ZodObject<{
        siteDomain: z.ZodString;
        observedUrl: z.ZodString;
        observedAt: z.ZodString;
        consentState: z.ZodEnum<["pre_consent", "post_consent", "no_mechanism"]>;
        requestType: z.ZodEnum<["tracker", "marketing", "analytics"]>;
        requestDestination: z.ZodString;
        evidenceHash: z.ZodString;
        policySnapshotId: z.ZodNullable<z.ZodString>;
        sessionId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        siteDomain: string;
        observedUrl: string;
        observedAt: string;
        consentState: "pre_consent" | "post_consent" | "no_mechanism";
        requestType: "tracker" | "marketing" | "analytics";
        requestDestination: string;
        evidenceHash: string;
        policySnapshotId: string | null;
        sessionId: string;
    }, {
        siteDomain: string;
        observedUrl: string;
        observedAt: string;
        consentState: "pre_consent" | "post_consent" | "no_mechanism";
        requestType: "tracker" | "marketing" | "analytics";
        requestDestination: string;
        evidenceHash: string;
        policySnapshotId: string | null;
        sessionId: string;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    installationId: string;
    records: {
        siteDomain: string;
        observedUrl: string;
        observedAt: string;
        consentState: "pre_consent" | "post_consent" | "no_mechanism";
        requestType: "tracker" | "marketing" | "analytics";
        requestDestination: string;
        evidenceHash: string;
        policySnapshotId: string | null;
        sessionId: string;
    }[];
}, {
    installationId: string;
    records: {
        siteDomain: string;
        observedUrl: string;
        observedAt: string;
        consentState: "pre_consent" | "post_consent" | "no_mechanism";
        requestType: "tracker" | "marketing" | "analytics";
        requestDestination: string;
        evidenceHash: string;
        policySnapshotId: string | null;
        sessionId: string;
    }[];
}>;
export declare const policySnapshotSubmissionSchema: z.ZodObject<{
    siteDomain: z.ZodString;
    policyUrl: z.ZodString;
    contentHash: z.ZodString;
    fetchedAt: z.ZodString;
    contentLength: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    siteDomain: string;
    policyUrl: string;
    contentHash: string;
    fetchedAt: string;
    contentLength: number;
}, {
    siteDomain: string;
    policyUrl: string;
    contentHash: string;
    fetchedAt: string;
    contentLength: number;
}>;
export declare const auditQuerySchema: z.ZodObject<{
    entityType: z.ZodOptional<z.ZodEnum<["evidence", "policy_snapshot", "violation"]>>;
    entityId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    limit: number;
    offset: number;
    entityType?: "evidence" | "policy_snapshot" | "violation" | undefined;
    entityId?: string | undefined;
}, {
    entityType?: "evidence" | "policy_snapshot" | "violation" | undefined;
    entityId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export type EvidenceSubmissionInput = z.infer<typeof evidenceSubmissionSchema>;
export type EvidenceBatchInput = z.infer<typeof evidenceBatchSchema>;
export type PolicySnapshotSubmissionInput = z.infer<typeof policySnapshotSubmissionSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
//# sourceMappingURL=schema.d.ts.map
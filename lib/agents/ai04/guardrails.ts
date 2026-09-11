export const AI04_GUARDRAILS = {
  isolatedFromOtherAgents: true,
  requireLicenseApprovalBeforePublish: true,
  requireVerifiedPaymentBeforeDelivery: true,
  neverInventRevenue: true,
  neverMoveFunds: true,
  neverChangePaymentDestination: true,
  escalateUnresolvedSupport: true,
} as const;
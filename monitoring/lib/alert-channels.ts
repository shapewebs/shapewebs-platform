import { EmailAlertChannel } from "checkly/constructs";

export const operationalEmailAlerts = new EmailAlertChannel(
  "shapewebs-operational-email",
  {
    address: "shapewebs@gmail.com",
    sendFailure: true,
    sendRecovery: true,
    sslExpiry: true,
    sslExpiryThreshold: 14,
  },
);

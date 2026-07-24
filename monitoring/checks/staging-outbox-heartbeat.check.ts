import { HeartbeatMonitor } from "checkly/constructs";

import { operationalEmailAlerts } from "../lib/alert-channels";
import {
  isChecklyCheckActivated,
  isChecklyOutboxHeartbeatReady,
} from "../lib/environment";

const checkId = "staging-outbox-heartbeat";

new HeartbeatMonitor(checkId, {
  name: "Staging outbox worker heartbeat",
  activated:
    isChecklyCheckActivated(checkId) && isChecklyOutboxHeartbeatReady(),
  alertChannels: [operationalEmailAlerts],
  period: 5,
  periodUnit: "minutes",
  grace: 6,
  graceUnit: "minutes",
  tags: ["heartbeat", "outbox", "scheduler", "staging"],
});

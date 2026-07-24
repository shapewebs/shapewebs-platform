import { runOutboxSchedule } from "./scheduler";

export default {
  async scheduled(controller, environment): Promise<void> {
    await runOutboxSchedule(controller, environment);
  },
} satisfies ExportedHandler<Env>;

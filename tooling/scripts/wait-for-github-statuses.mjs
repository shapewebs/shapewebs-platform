const terminalFailureStates = new Set(["error", "failure"]);

function parseTimestamp(value) {
  if (typeof value !== "string") {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

export function evaluateRequiredStatuses(requiredContexts, statuses) {
  if (!Array.isArray(requiredContexts) || requiredContexts.length === 0) {
    throw new Error("At least one required deployment context is required.");
  }

  if (!Array.isArray(statuses)) {
    throw new Error("GitHub returned an invalid commit-status payload.");
  }

  const latestStatuses = new Map();

  for (const status of statuses) {
    if (
      typeof status !== "object" ||
      status === null ||
      typeof status.context !== "string" ||
      typeof status.state !== "string"
    ) {
      continue;
    }

    const current = latestStatuses.get(status.context);

    if (
      !current ||
      parseTimestamp(status.updated_at) > parseTimestamp(current.updated_at)
    ) {
      latestStatuses.set(status.context, status);
    }
  }

  for (const context of requiredContexts) {
    const status = latestStatuses.get(context);

    if (status && terminalFailureStates.has(status.state)) {
      return { context, state: "failure" };
    }
  }

  const pendingContexts = requiredContexts.filter(
    (context) => latestStatuses.get(context)?.state !== "success",
  );

  return pendingContexts.length === 0
    ? { state: "success" }
    : { pendingContexts, state: "pending" };
}

function readBoundedInteger(name, fallback, minimum, maximum) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }

  return value;
}

function readConfiguration() {
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const sha = process.env.SHAPEWEBS_DEPLOYMENT_SHA ?? "";
  const token = process.env.GITHUB_TOKEN ?? "";
  const requiredContexts = (
    process.env.SHAPEWEBS_REQUIRED_DEPLOYMENT_CONTEXTS ?? ""
  )
    .split(",")
    .map((context) => context.trim())
    .filter(Boolean);

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(
      "GITHUB_REPOSITORY must be an exact owner/repository name.",
    );
  }

  if (!/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error("SHAPEWEBS_DEPLOYMENT_SHA must be a full commit SHA.");
  }

  if (token.length < 20) {
    throw new Error("GITHUB_TOKEN is required to read deployment statuses.");
  }

  if (
    requiredContexts.length === 0 ||
    new Set(requiredContexts).size !== requiredContexts.length
  ) {
    throw new Error(
      "SHAPEWEBS_REQUIRED_DEPLOYMENT_CONTEXTS must contain unique contexts.",
    );
  }

  return {
    intervalSeconds: readBoundedInteger(
      "SHAPEWEBS_DEPLOYMENT_POLL_SECONDS",
      10,
      5,
      60,
    ),
    repository,
    requiredContexts,
    sha,
    timeoutSeconds: readBoundedInteger(
      "SHAPEWEBS_DEPLOYMENT_TIMEOUT_SECONDS",
      600,
      60,
      1_200,
    ),
    token,
  };
}

async function readCommitStatuses(configuration) {
  const response = await fetch(
    `https://api.github.com/repos/${configuration.repository}/commits/${configuration.sha}/status?per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${configuration.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub commit-status request failed with HTTP ${response.status}.`,
    );
  }

  const payload = await response.json();

  if (
    typeof payload !== "object" ||
    payload === null ||
    !Array.isArray(payload.statuses)
  ) {
    throw new Error("GitHub returned an invalid commit-status payload.");
  }

  return payload.statuses;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function waitForRequiredStatuses() {
  const configuration = readConfiguration();
  const deadline = Date.now() + configuration.timeoutSeconds * 1_000;

  while (Date.now() < deadline) {
    const statuses = await readCommitStatuses(configuration);
    const result = evaluateRequiredStatuses(
      configuration.requiredContexts,
      statuses,
    );

    if (result.state === "success") {
      console.log("Required staging deployment statuses are successful.");
      return;
    }

    if (result.state === "failure") {
      throw new Error(`Staging deployment failed for ${result.context}.`);
    }

    console.log(
      `Waiting for staging deployments: ${result.pendingContexts.join(", ")}.`,
    );
    await wait(configuration.intervalSeconds * 1_000);
  }

  throw new Error("Timed out waiting for required staging deployments.");
}

if (process.argv[1]?.endsWith("wait-for-github-statuses.mjs")) {
  waitForRequiredStatuses().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Deployment wait failed.",
    );
    process.exitCode = 1;
  });
}

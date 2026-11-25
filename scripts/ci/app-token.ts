// Gets a short-lived token of the sync's GitHub App for the weekly sync's pull request (spec: D-023, D-024).
// Pushes made with the workflow's own token start no workflows, so CI would not run on the pull request as on any
// other; pushes made with an app's token do. The token may only write contents and pull requests, in this
// repository. Without SYNC_APP_ID and SYNC_APP_PRIVATE_KEY it does nothing, and the sync uses the workflow's token.
// Writes SYNC_TOKEN to $GITHUB_ENV, masked in the log.
// Usage (in GitHub Actions): node scripts/ci/app-token.ts

import { createSign } from "node:crypto";
import { appendFileSync } from "node:fs";

/** A JSON Web Token that identifies the app for 10 minutes, as GitHub asks; `iat` is a minute early for clock drift. */
export function appJwt(appId: string, privateKey: string, nowSec: number): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part({ iat: nowSec - 60, exp: nowSec + 540, iss: appId })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url");
  return `${unsigned}.${signature}`;
}

async function api<T>(path: string, jwt: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${init.method ?? "GET"} ${path}: ${await response.text()}`);
  return (await response.json()) as T;
}

if (import.meta.main) {
  const {
    SYNC_APP_ID: appId,
    SYNC_APP_PRIVATE_KEY: key,
    GITHUB_REPOSITORY: repository,
    GITHUB_ENV: envFile,
  } = process.env;
  if (!appId || !key) {
    console.log("No sync app configured; the sync uses the workflow's token and starts CI by hand.");
  } else {
    if (!repository || !envFile) throw new Error("GITHUB_REPOSITORY and GITHUB_ENV are set only in GitHub Actions.");
    const jwt = appJwt(appId, key, Math.floor(Date.now() / 1000));
    const { id } = await api<{ id: number }>(`/repos/${repository}/installation`, jwt);
    const { token } = await api<{ token: string }>(`/app/installations/${id}/access_tokens`, jwt, {
      method: "POST",
      body: JSON.stringify({
        repositories: [repository.split("/")[1]],
        permissions: { contents: "write", pull_requests: "write" },
      }),
    });
    console.log(`::add-mask::${token}`);
    appendFileSync(envFile, `SYNC_TOKEN=${token}\n`);
    console.log("Got a token of the sync app.");
  }
}

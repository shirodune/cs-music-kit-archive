import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, test } from "vitest";
import { appJwt } from "../../scripts/ci/app-token.ts";

describe("sync app token", () => {
  test("D-024 the app's JWT is signed with its key and lasts under GitHub's 10 minutes", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
    const jwt = appJwt("12345", pem, 1_800_000_000);
    const [header, payload, signature] = jwt.split(".") as [string, string, string];
    const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString());

    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = decode(payload);
    expect(claims.iss).toBe("12345");
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(600);
    expect(claims.iat).toBeLessThan(1_800_000_000);
    const verified = createVerify("RSA-SHA256")
      .update(`${header}.${payload}`)
      .verify(publicKey, signature, "base64url");
    expect(verified).toBe(true);
  });
});

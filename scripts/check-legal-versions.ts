#!/usr/bin/env node
// Fails the build if frontend and backend legal version constants disagree.
// Run from the `javelina/` repo root.

import { CURRENT_VERSIONS as FRONTEND_VERSIONS } from "../lib/legal/versions";
import * as fs from "fs";
import * as path from "path";

const backendVersionsPath = path.resolve(
  __dirname,
  "../../javelina-backend/src/lib/legalVersions.ts"
);

if (!fs.existsSync(backendVersionsPath)) {
  console.error(
    `[legal-versions] Backend versions file not found at ${backendVersionsPath}`
  );
  process.exit(1);
}

const backendSource = fs.readFileSync(backendVersionsPath, "utf8");

const extract = (key: string): string | null => {
  const match = backendSource.match(
    new RegExp(`${key}\\s*:\\s*"([^"]+)"`)
  );
  return match ? match[1] : null;
};

const mismatches: string[] = [];

(Object.keys(FRONTEND_VERSIONS) as Array<keyof typeof FRONTEND_VERSIONS>).forEach(
  (key) => {
    const backendValue = extract(key);
    const frontendValue = FRONTEND_VERSIONS[key];
    if (backendValue !== frontendValue) {
      mismatches.push(
        `  ${key}: frontend="${frontendValue}" backend="${backendValue ?? "MISSING"}"`
      );
    }
  }
);

if (mismatches.length > 0) {
  console.error("[legal-versions] Frontend/backend version mismatch:");
  mismatches.forEach((line) => console.error(line));
  process.exit(1);
}

console.log("[legal-versions] OK — frontend and backend constants match.");

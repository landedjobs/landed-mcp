import assert from "node:assert/strict";
import test from "node:test";
import { searchJobsInput } from "./search-input";

test("accepts structured physical and remote eligibility geography", () => {
  const parsed = searchJobsInput.parse({
    locations: ["Bengaluru, India"],
    countryCodes: ["IN"],
    regionCodes: ["apac"],
    workAuthorizationCountryCodes: ["IN"],
    remote: "remote",
  });
  assert.deepEqual(parsed.countryCodes, ["IN"]);
  assert.deepEqual(parsed.regionCodes, ["apac"]);
});

test("rejects non-canonical country and region codes", () => {
  assert.equal(
    searchJobsInput.safeParse({ countryCodes: ["india"] }).success,
    false,
  );
  assert.equal(
    searchJobsInput.safeParse({ regionCodes: ["asia"] }).success,
    false,
  );
});

test("keeps legacy human-readable regions additive", () => {
  assert.equal(
    searchJobsInput.safeParse({ regions: ["India", "EU"] }).success,
    true,
  );
});

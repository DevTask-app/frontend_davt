import { describe, expect, it } from "vitest";
import { normalizeEnumValue } from "@/lib/server/enums";
import { cleanInput } from "@/lib/server/validation";

describe("cleanInput", () => {
  it("trims strings and converts empty strings to null", () => {
    expect(cleanInput("  hello  ")).toBe("hello");
    expect(cleanInput("   ")).toBe(null);
    expect(cleanInput("")).toBe(null);
  });

  it("cleans nested objects and arrays", () => {
    expect(cleanInput({ name: " a ", nested: { value: " b " }, list: [" c ", ""] })).toEqual({
      name: "a",
      nested: { value: "b" },
      list: ["c", null],
    });
  });

  it("passes through numbers, booleans and null", () => {
    expect(cleanInput(5)).toBe(5);
    expect(cleanInput(true)).toBe(true);
    expect(cleanInput(null)).toBe(null);
    expect(cleanInput(undefined)).toBe(undefined);
  });
});

describe("normalizeEnumValue", () => {
  const statuses = ["Backlog", "To Do", "In Progress", "In Review", "Blocked", "Done"];

  it("resolves snake_case, kebab-case, spaces and case names", () => {
    expect(normalizeEnumValue("in_progress", statuses)).toBe("In Progress");
    expect(normalizeEnumValue("in-progress", statuses)).toBe("In Progress");
    expect(normalizeEnumValue("InProgress", statuses)).toBe("In Progress");
    expect(normalizeEnumValue("IN PROGRESS", statuses)).toBe("In Progress");
    expect(normalizeEnumValue("to_do", statuses)).toBe("To Do");
    expect(normalizeEnumValue("todo", statuses)).toBe("To Do");
    expect(normalizeEnumValue("Backlog", statuses)).toBe("Backlog");
  });

  it("returns unrecognized values unchanged", () => {
    expect(normalizeEnumValue("Nope", statuses)).toBe("Nope");
    expect(normalizeEnumValue(42, statuses)).toBe(42);
  });
});

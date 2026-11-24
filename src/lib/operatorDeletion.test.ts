import { describe, it, expect } from "vitest";
import { operatorDeletionError } from "../../supabase/functions/_shared/operator-deletion";

const valid = { callerIsAdmin: true, callerId: "rico", targetId: "operator", targetIsAdmin: false, targetIsOperator: true, hasTenantLinks: false };
describe("Administrator-only operator deletion", () => {
  it("allows Rico's administrator permission to delete another operator", () => {
    expect(operatorDeletionError(valid)).toBeNull();
  });
  it("rejects ordinary operators", () => {
    expect(operatorDeletionError({ ...valid, callerIsAdmin: false })).toBe("Kun administratoren kan slette operatører");
  });
  it("protects the administrator's own account", () => {
    expect(operatorDeletionError({ ...valid, targetId: "rico" })).toBe("Administratoren kan ikke slettes");
  });
  it("protects administrator targets", () => {
    expect(operatorDeletionError({ ...valid, targetIsAdmin: true })).toBe("Administratoren kan ikke slettes");
  });
  it("does not delete tenant-linked accounts", () => {
    expect(operatorDeletionError({ ...valid, hasTenantLinks: true })).toBe("Operatøren er også knyttet til en lejer og kan ikke slettes");
  });
});
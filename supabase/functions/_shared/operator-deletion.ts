export function operatorDeletionError(input: {
  callerIsAdmin: boolean; callerId: string; targetId: string;
  targetIsAdmin: boolean; targetIsOperator: boolean; hasTenantLinks: boolean;
}): string | null {
  if (!input.callerIsAdmin) return "Kun administratoren kan slette operatører";
  if (input.callerId === input.targetId || input.targetIsAdmin) return "Administratoren kan ikke slettes";
  if (!input.targetIsOperator) return "Operatøren findes ikke";
  if (input.hasTenantLinks) return "Operatøren er også knyttet til en lejer og kan ikke slettes";
  return null;
}
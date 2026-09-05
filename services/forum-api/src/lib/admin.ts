class AdminAccessError extends Error {
  readonly status = 403 as const;

  constructor(message = "Administrator access required.") {
    super(message);
    this.name = "AdminAccessError";
  }
}

function parseAdminUserIds(raw: string | undefined): ReadonlySet<string> {
  if (!raw?.trim()) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function requireAdminUser(userId: string, adminUserIds: ReadonlySet<string>): void {
  if (!adminUserIds.has(userId)) {
    throw new AdminAccessError();
  }
}

export { AdminAccessError, parseAdminUserIds, requireAdminUser };

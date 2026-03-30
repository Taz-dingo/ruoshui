function createEntityId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2, 14);

  return `${prefix}_${suffix}`;
}

export { createEntityId };

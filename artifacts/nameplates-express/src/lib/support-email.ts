export const DEFAULT_SUPPORT_EMAIL = "info@nameplatesexpress.com";

export function resolveSupportEmail(setting: unknown): string {
  if (typeof setting !== "string") {
    return DEFAULT_SUPPORT_EMAIL;
  }

  const trimmed = setting.trim();
  return trimmed || DEFAULT_SUPPORT_EMAIL;
}

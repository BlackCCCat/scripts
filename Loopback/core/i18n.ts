export type Locale = "zh" | "en";

/** Chinese UI is selected only for Chinese locales; every other locale falls back to English. */
export const locale: Locale = /^zh(?:[-_]|$)/i.test(Device.systemLocale) ? "zh" : "en";

export function tx(zh: string, en: string): string {
  return locale === "zh" ? zh : en;
}

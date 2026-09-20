import ro from "@hailmary/shared/messages/ro.json";
import en from "@hailmary/shared/messages/en.json";

export type Locale = "ro" | "en";

// The locales the app serves, so a page object can be pointed at either one.
export const MESSAGES = { ro, en };

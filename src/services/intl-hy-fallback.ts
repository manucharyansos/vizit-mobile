// Some browsers (e.g. builds with reduced ICU data) have no Armenian date data
// and silently format "hy-AM" dates as en-US ("10/28/2026, 10:00 AM").
// When that happens, format Armenian dates with the Russian numeric pattern
// (28.10.2026, 10:00 — the same order Armenia uses) and Armenian month and
// weekday names. Browsers that support "hy-AM" are left untouched.

const ARMENIAN = /^hy(-AM)?$/i;

const MONTHS_LONG = ["հունվարի", "փետրվարի", "մարտի", "ապրիլի", "մայիսի", "հունիսի", "հուլիսի", "օգոստոսի", "սեպտեմբերի", "հոկտեմբերի", "նոյեմբերի", "դեկտեմբերի"];
// Month on its own ("Հոկտեմբեր 2026") uses the nominative form.
const MONTHS_NOMINATIVE = ["հունվար", "փետրվար", "մարտ", "ապրիլ", "մայիս", "հունիս", "հուլիս", "օգոստոս", "սեպտեմբեր", "հոկտեմբեր", "նոյեմբեր", "դեկտեմբեր"];
const MONTHS_SHORT = ["հնվ", "փտվ", "մրտ", "ապր", "մյս", "հնս", "հլս", "օգս", "սեպ", "հոկ", "նոյ", "դեկ"];
const WEEKDAYS_LONG = ["կիրակի", "երկուշաբթի", "երեքշաբթի", "չորեքշաբթի", "հինգշաբթի", "ուրբաթ", "շաբաթ"];
const WEEKDAYS_SHORT = ["կիր", "երկ", "երք", "չրք", "հնգ", "ուրբ", "շբթ"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Locales = string | readonly string[] | undefined;

function isArmenian(locales: Locales) {
  const first = Array.isArray(locales) ? locales[0] : locales;
  return typeof first === "string" && ARMENIAN.test(first);
}

function hasArmenianData() {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(["hy-AM"]).length > 0;
  } catch {
    return true;
  }
}

export function installArmenianDateFallback() {
  if (typeof Intl === "undefined" || hasArmenianData()) return;

  const Native = Intl.DateTimeFormat;

  function toDate(value?: Date | number | string) {
    return value === undefined ? new Date() : new Date(value);
  }

  function armenianParts(base: Intl.DateTimeFormat, options: Intl.DateTimeFormatOptions, value?: Date | number | string) {
    const date = toDate(value);
    const zone = options.timeZone;
    return base.formatToParts(date).flatMap((part): Intl.DateTimeFormatPart[] => {
      if (part.type === "month" && (options.month === "long" || options.month === "short" || options.month === "narrow")) {
        const index = Number(new Native("en-US", { month: "numeric", timeZone: zone }).format(date)) - 1;
        const names = options.month !== "long" ? MONTHS_SHORT : options.day ? MONTHS_LONG : MONTHS_NOMINATIVE;
        return [{ ...part, value: names[index] ?? part.value }];
      }
      if (part.type === "weekday") {
        const index = EN_WEEKDAYS.indexOf(new Native("en-US", { weekday: "short", timeZone: zone }).format(date));
        return [{ ...part, value: (options.weekday === "long" ? WEEKDAYS_LONG : WEEKDAYS_SHORT)[index] ?? part.value }];
      }
      if (part.type === "literal") {
        // Drop Russian-only words such as "г." (year) and "в" (at).
        const cleaned = part.value.replace(/\s?г\.?/g, "").replace(/\sв\s/g, ", ");
        return cleaned ? [{ ...part, value: cleaned }] : [];
      }
      return [part];
    });
  }

  function ArmenianAwareDateTimeFormat(this: unknown, locales?: Locales, options?: Intl.DateTimeFormatOptions) {
    if (!isArmenian(locales)) return new Native(locales as string | string[] | undefined, options);
    const opts = options ?? {};
    const base = new Native("ru-RU", opts);
    const formatter = {
      format: (value?: Date | number | string) => armenianParts(base, opts, value).map((p) => p.value).join("").trim(),
      formatToParts: (value?: Date | number | string) => armenianParts(base, opts, value),
      resolvedOptions: () => ({ ...base.resolvedOptions(), locale: "hy-AM" }),
      formatRange: (a: Date | number, b: Date | number) => `${formatter.format(a)} – ${formatter.format(b)}`,
    };
    return formatter as unknown as Intl.DateTimeFormat;
  }
  ArmenianAwareDateTimeFormat.supportedLocalesOf = Native.supportedLocalesOf.bind(Native);
  (Intl as { DateTimeFormat: unknown }).DateTimeFormat = ArmenianAwareDateTimeFormat;

  const dateTimeDefaults: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" };
  const dateDefaults: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
  const timeDefaults: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

  const patch = (method: "toLocaleString" | "toLocaleDateString" | "toLocaleTimeString", defaults: Intl.DateTimeFormatOptions) => {
    const original = Date.prototype[method];
    // Intentional: only Armenian locales are rerouted, everything else calls the original.
    // eslint-disable-next-line no-extend-native
    Date.prototype[method] = function (this: Date, locales?: Locales, options?: Intl.DateTimeFormatOptions) {
      if (!isArmenian(locales)) return original.call(this, locales as string | string[] | undefined, options);
      const hasFields = options && ["year", "month", "day", "weekday", "hour", "minute", "second", "dateStyle", "timeStyle"].some((k) => k in options);
      return new Intl.DateTimeFormat("hy-AM", hasFields ? options : { ...defaults, ...(options ?? {}) }).format(this);
    };
  };
  patch("toLocaleString", dateTimeDefaults);
  patch("toLocaleDateString", dateDefaults);
  patch("toLocaleTimeString", timeDefaults);
}

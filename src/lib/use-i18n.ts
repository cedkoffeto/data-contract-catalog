"use client";

import { useEffect, useState } from "react";
import { type Locale, getLocale, dictionaries } from "./i18n";

export function useT() {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => { setLocale(getLocale()); }, []);
  const tFn = (key: keyof (typeof dictionaries)["en"]) =>
    dictionaries[locale][key] ?? dictionaries.en[key];
  const tWithFn = (key: keyof (typeof dictionaries)["en"], values: Record<string, string>) =>
    tFn(key).replace(/\{(\w+)\}/g, (_, token: string) => values[token] ?? "");
  return { t: tFn, tWith: tWithFn };
}

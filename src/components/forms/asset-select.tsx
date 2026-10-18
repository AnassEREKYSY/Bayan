"use client";

import { useTranslations } from "next-intl";

import { Select } from "@/components/ui/form";

export interface AssetOption {
  id: string;
  symbol: string;
  name: string;
  market: string;
  currency: string;
}

const marketOrder = ["casablanca", "us", "europe", "commodities", "crypto"];

/** Native select grouped by market: accessible and comfortable on phones. */
export function AssetSelect({
  id,
  name,
  assets,
  defaultValue,
  invalid,
  onChange,
}: {
  id: string;
  name: string;
  assets: AssetOption[];
  defaultValue?: string;
  invalid?: boolean;
  onChange?: (asset: AssetOption | undefined) => void;
}) {
  const t = useTranslations();
  const groups = marketOrder
    .map((m) => ({ market: m, items: assets.filter((a) => a.market === m) }))
    .filter((g) => g.items.length > 0);

  return (
    <Select
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      aria-invalid={invalid || undefined}
      required
      onChange={(e) => onChange?.(assets.find((a) => a.id === e.target.value))}
    >
      <option value="" disabled>
        {t("forms.chooseAsset")}
      </option>
      {groups.map((g) => (
        <optgroup key={g.market} label={t(`enums.market.${g.market}` as never)}>
          {g.items.map((a) => (
            <option key={a.id} value={a.id}>
              {a.symbol} — {a.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, FileText, ShieldCheck, Wand2, AlertTriangle } from "lucide-react";

const OPTIONS = {
  morphology: [
    { v: "solid", l: "Solid" },
    { v: "cystic", l: "Kistik" },
    { v: "mixed", l: "Mikst" },
  ],
  sizeUnit: [
    { v: "mm", l: "mm" },
    { v: "cm", l: "cm" },
  ],
  densityCT: [
    { v: "hypodense", l: "Hipodens" },
    { v: "isodense", l: "İzodens" },
    { v: "hyperdense", l: "Hiperdens" },
    { v: "na", l: "BT yok / bilinmiyor" },
  ],
  t1: [
    { v: "hyper", l: "T1 hiper" },
    { v: "iso", l: "T1 izo" },
    { v: "hypo", l: "T1 hipo" },
    { v: "na", l: "T1 yok / bilinmiyor" },
  ],
  t2: [
    { v: "hyper", l: "T2 hiper" },
    { v: "iso", l: "T2 izo" },
    { v: "hypo", l: "T2 hipo" },
    { v: "na", l: "T2 yok / bilinmiyor" },
  ],
  diffusion: [
    { v: "restricted", l: "Restriksiyon var" },
    { v: "no", l: "Restriksiyon yok" },
    { v: "na", l: "DWI yok / bilinmiyor" },
  ],
  enhancementGeneral: [
    { v: "none", l: "Kontrastlanma yok" },
    { v: "peripheral", l: "Periferik" },
    { v: "homogeneous", l: "Homojen" },
    { v: "heterogeneous", l: "Heterojen" },
    { v: "na", l: "Dinamik yok / bilinmiyor" },
  ],
  phaseIntensity: [
    { v: "na", l: "Değerlendirilmedi" },
    { v: "hypo", l: "Hipo" },
    { v: "iso", l: "İzo" },
    { v: "hyper", l: "Hiper" },
  ],
  yesNoNA: [
    { v: "na", l: "Değerlendirilmedi" },
    { v: "no", l: "Yok" },
    { v: "yes", l: "Var" },
  ],
  confidence: [
    { v: "low", l: "Düşük" },
    { v: "medium", l: "Orta" },
    { v: "high", l: "Yüksek" },
  ],
  likelihood: [
    { v: "low", l: "Düşük" },
    { v: "medium", l: "Orta" },
    { v: "high", l: "Yüksek" },
  ],
  followup: [
    { v: "none", l: "Takip gerekmiyor" },
    { v: "dyn_mri", l: "Dinamik karaciğer MR" },
    { v: "triphasic_ct", l: "Triphasic karaciğer BT" },
    { v: "us_follow", l: "US takip" },
    { v: "clinic_corr", l: "Klinik/önceki tetkiklerle korelasyon" },
  ],
  segments: [
    "I",
    "II",
    "III",
    "IVa",
    "IVb",
    "V",
    "VI",
    "VII",
    "VIII",
    "Belirsiz",
  ].map((s) => ({ v: s, l: s })),
  differentials: [
    "Hemanjiom",
    "Metastaz",
    "FNH",
    "HCC",
    "Adenom",
    "Kist (basit)",
    "Apse",
    "Kolanjiyokarsinom",
    "Diğer",
  ] as const,
  liRads: [
    { v: "na", l: "Seçilmedi" },
    { v: "LR-1", l: "LR-1 (Kesin benign)" },
    { v: "LR-2", l: "LR-2 (Muhtemel benign)" },
    { v: "LR-3", l: "LR-3 (Ara olasılık)" },
    { v: "LR-4", l: "LR-4 (Muhtemel HCC)" },
    { v: "LR-5", l: "LR-5 (Kesin HCC)" },
    { v: "LR-M", l: "LR-M (Malignite lehine, HCC dışı)" },
    { v: "LR-TIV", l: "LR-TIV (Tümör trombüsü)" },
  ],
  riskContext: [
    { v: "cirrhosis", l: "Siroz" },
    { v: "hbv", l: "Kronik HBV" },
    { v: "hcv", l: "Kronik HCV" },
    { v: "other", l: "Diğer risk faktörü" },
    { v: "unknown", l: "Bilinmiyor" },
  ] as const,
} as const;

type LikelihoodLevel = (typeof OPTIONS.likelihood)[number]["v"];

type DifferentialItem = {
  name: (typeof OPTIONS.differentials)[number];
  enabled: boolean;
  likelihood: LikelihoodLevel;
  percent: number;
  note?: string;
};

type RiskContext = (typeof OPTIONS.riskContext)[number]["v"];

type SuggestedDiff = {
  name: (typeof OPTIONS.differentials)[number];
  likelihood?: LikelihoodLevel;
  percent?: number;
  why: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toMm(sizeStr: string, unit: string): number | null {
  const v = Number(String(sizeStr).replace(",", "."));
  if (!Number.isFinite(v) || v <= 0) return null;
  return unit === "cm" ? v * 10 : v;
}

function isArterialHyper(v: string) {
  return v === "hyper";
}

function isWashoutLike(portal: string, delayed: string) {
  return portal === "hypo" || delayed === "hypo";
}

function phaseLabel(v: string) {
  return OPTIONS.phaseIntensity.find((x) => x.v === v)?.l ?? v;
}

function normalizePercents(items: DifferentialItem[]): DifferentialItem[] {
  const enabled = items.filter((i) => i.enabled);
  if (enabled.length === 0) return items;

  const sum = enabled.reduce(
    (a, b) => a + (Number.isFinite(b.percent) ? b.percent : 0),
    0
  );

  if (sum <= 0) {
    const even = Math.floor(100 / enabled.length);
    const remainder = 100 - even * enabled.length;
    let k = 0;
    return items.map((i) => {
      if (!i.enabled) return i;
      const extra = k < remainder ? 1 : 0;
      k += 1;
      return { ...i, percent: even + extra };
    });
  }

  const next = items.map((i) => {
    if (!i.enabled) return i;
    const p = (i.percent / sum) * 100;
    return { ...i, percent: Math.round(p) };
  });

  const idx = next
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => it.enabled)
    .map(({ i }) => i);

  const newSum = idx.reduce((acc, i) => acc + next[i].percent, 0);
  const drift = 100 - newSum;
  if (drift !== 0 && idx.length > 0) {
    const first = idx[0];
    next[first] = {
      ...next[first],
      percent: clamp(next[first].percent + drift, 0, 100),
    };
  }

  return next;
}

function deriveSuggestions(args: {
  hasDynamic: boolean;
  arterial: string;
  portal: string;
  delayed: string;
  capsule: string;
  t2: string;
  diffusion: string;
  morphology: string;
  generalEnh: string;
  riskContextSelected: boolean;
}): { hints: string[]; suggestedDifferentials: SuggestedDiff[] } {
  const {
    hasDynamic,
    arterial,
    portal,
    delayed,
    capsule,
    t2,
    diffusion,
    morphology,
    generalEnh,
    riskContextSelected,
  } = args;

  const hints: string[] = [];
  const suggested: SuggestedDiff[] = [];

  const washout = hasDynamic && isWashoutLike(portal, delayed);
  const aHyper = hasDynamic && arterial !== "na" && isArterialHyper(arterial);
  const capYes = hasDynamic && capsule === "yes";

  if (
    morphology === "cystic" &&
    (!hasDynamic
      ? generalEnh === "none"
      : arterial === "na" && portal === "na" && delayed === "na")
  ) {
    hints.push(
      "Kistik morfoloji ön planda; basit kist olasılığı düşünülebilir (klinik korelasyon)."
    );
    suggested.push({
      name: "Kist (basit)",
      likelihood: "high",
      percent: 70,
      why: "Kistik morfoloji + kontrastlanma olmaması.",
    });
  }

  if (t2 === "hyper" && diffusion === "no") {
    if (hasDynamic) {
      if (arterial === "hyper" && (delayed === "iso" || delayed === "hyper")) {
        hints.push(
          "T2 hiperintensite ve dinamik dolum paterni hemanjiom ile uyumlu olabilir (faz zamanlaması önemlidir)."
        );
        suggested.push({
          name: "Hemanjiom",
          likelihood: "high",
          percent: 65,
          why: "T2 hiper + restriksiyon yok + dinamik dolum paterni.",
        });
      }
    } else if (generalEnh === "peripheral") {
      hints.push(
        "T2 hiperintensite + periferik kontrastlanma paterni hemanjiom ile uyumlu olabilir."
      );
      suggested.push({
        name: "Hemanjiom",
        likelihood: "high",
        percent: 60,
        why: "T2 hiper + periferik patern.",
      });
    }
  }

  if (aHyper && washout) {
    hints.push(
      "Arteriyel faz hiper + washout benzeri görünüm hiper-vasküler malignite (HCC dahil) lehine olabilir; klinik bağlamla birlikte değerlendirilmelidir."
    );
    suggested.push({
      name: "HCC",
      likelihood: "medium",
      percent: 40,
      why: "Arteriyel hiper + washout.",
    });
    suggested.push({
      name: "Adenom",
      likelihood: "low",
      percent: 15,
      why: "Hiper-vasküler lezyon ayırıcıda.",
    });
  }

  if (aHyper && capYes) {
    hints.push(
      "Arteriyel hiper + kapsül görünümü malignite lehine olabilir (riskli karaciğer bağlamında)."
    );
    suggested.push({
      name: "HCC",
      likelihood: "medium",
      percent: 45,
      why: "Arteriyel hiper + kapsül.",
    });
  }

  if (diffusion === "restricted") {
    hints.push(
      "Restriksiyon varlığı apse/metastaz gibi seçenekleri destekleyebilir (klinik korelasyon, laboratuvar ve dinamik paternle birlikte)."
    );
    suggested.push({
      name: "Metastaz",
      likelihood: "medium",
      percent: 35,
      why: "Restriksiyon varlığı.",
    });
    suggested.push({
      name: "Apse",
      likelihood: "low",
      percent: 15,
      why: "Klinik uyum varsa.",
    });
  }

  if (!riskContextSelected) {
    hints.push(
      "Riskli karaciğer bağlamı (siroz/HBV/HCV vb.) belirtilmeden LI-RADS yorumları sınırlı kalır."
    );
  }

  const byName = new Map<string, SuggestedDiff>();
  for (const s of suggested) {
    const prev = byName.get(s.name);
    if (!prev) {
      byName.set(s.name, s);
      continue;
    }
    const pr = prev.percent ?? 0;
    const nr = s.percent ?? 0;
    if (nr > pr) byName.set(s.name, s);
  }

  return { hints, suggestedDifferentials: Array.from(byName.values()) };
}

function deriveFollowupSuggestion(args: {
  sizeMm: number | null;
  isDefinitive: boolean;
  hasDynamic: boolean;
  arterial: string;
  portal: string;
  delayed: string;
  diffusion: string;
  riskContextSelected: boolean;
}): { followup: (typeof OPTIONS.followup)[number]["v"]; message: string } {
  const {
    sizeMm,
    isDefinitive,
    hasDynamic,
    arterial,
    portal,
    delayed,
    diffusion,
    riskContextSelected,
  } = args;

  if (isDefinitive) {
    return {
      followup: "none",
      message:
        "Kesin tanı belirtildi: klinik gereklilik halinde takip planlanabilir.",
    };
  }

  const aHyper = hasDynamic && arterial !== "na" && isArterialHyper(arterial);
  const washout = hasDynamic && isWashoutLike(portal, delayed);

  if (!hasDynamic) {
    return {
      followup: "dyn_mri",
      message:
        "Dinamik faz bilgisi sınırlı: karakterizasyon için dinamik karaciğer MR düşünülebilir.",
    };
  }

  if (aHyper && washout && riskContextSelected) {
    return {
      followup: "dyn_mri",
      message:
        "Arteriyel hiper + washout ve riskli karaciğer bağlamı varsa ileri karakterizasyon/evreleme için dinamik MR uygun olabilir.",
    };
  }

  if (diffusion === "restricted") {
    return {
      followup: "clinic_corr",
      message:
        "Restriksiyon var: klinik/laboratuvar korelasyonu ve gerekirse dinamik MR/BT ile ileri değerlendirme düşünülebilir.",
    };
  }

  if (sizeMm !== null && sizeMm >= 20) {
    return {
      followup: "dyn_mri",
      message:
        "Lezyon ≥20 mm ise (özellikle nonspesifik bulguda) dinamik MR ile ileri karakterizasyon düşünülebilir.",
    };
  }

  return {
    followup: "us_follow",
    message:
      "Düşük risk/nonspesifik görünümde kısa aralıklı US takip seçeneği değerlendirilebilir (klinik bağlama göre).",
  };
}

function LikelihoodBadge({ lvl }: { lvl: LikelihoodLevel }) {
  const label = OPTIONS.likelihood.find((x) => x.v === lvl)?.l ?? lvl;
  return <Badge variant="outline">{label}</Badge>;
}

export default function Page() {
  const [segment, setSegment] = useState<string>("VI");
  const [size, setSize] = useState<string>("18");
  const [sizeUnit, setSizeUnit] = useState<string>("mm");
  const [morphology, setMorphology] = useState<string>("solid");
  const [densityCT, setDensityCT] = useState<string>("hypodense");
  const [t1, setT1] = useState<string>("na");
  const [t2, setT2] = useState<string>("hyper");
  const [diffusion, setDiffusion] = useState<string>("no");

  const [hasDynamic, setHasDynamic] = useState<boolean>(true);
  const [arterial, setArterial] = useState<string>("hyper");
  const [portal, setPortal] = useState<string>("iso");
  const [delayed, setDelayed] = useState<string>("iso");
  const [capsule, setCapsule] = useState<string>("na");
  const [generalEnh, setGeneralEnh] = useState<string>("peripheral");

  const [isDefinitive, setIsDefinitive] = useState<boolean>(false);
  const [definitiveDx, setDefinitiveDx] = useState<
    (typeof OPTIONS.differentials)[number]
  >("Hemanjiom");
  const [confidence, setConfidence] = useState<LikelihoodLevel>("medium");

  const [enableLiRads, setEnableLiRads] = useState<boolean>(false);
  const [liRadsCat, setLiRadsCat] = useState<string>("na");

  const [riskContext, setRiskContext] = useState<Record<RiskContext, boolean>>({
    cirrhosis: false,
    hbv: false,
    hcv: false,
    other: false,
    unknown: true,
  });

  const [likelihoodMode, setLikelihoodMode] = useState<"level" | "percent">(
    "level"
  );

  const [differentials, setDifferentials] = useState<DifferentialItem[]>(
    OPTIONS.differentials.map((n) => ({
      name: n,
      enabled: n === "Hemanjiom" || n === "Metastaz",
      likelihood:
        n === "Hemanjiom" ? "high" : n === "Metastaz" ? "medium" : "low",
      percent: n === "Hemanjiom" ? 55 : n === "Metastaz" ? 25 : 0,
      note: "",
    }))
  );

  const [extraFindings, setExtraFindings] = useState<string>(
    "Safra kesesi lümeninde belirgin taş lehine görünüm izlenmedi."
  );
  const [followup, setFollowup] = useState<string>("dyn_mri");
  const [freeRecommendation, setFreeRecommendation] = useState<string>(
    "Klinik ve önceki tetkiklerle korelasyon önerilir."
  );

  useEffect(() => {
    if (hasDynamic) return;
    setArterial("na");
    setPortal("na");
    setDelayed("na");
    setCapsule("na");
  }, [hasDynamic]);

  const sizeMm = useMemo(() => toMm(size, sizeUnit), [size, sizeUnit]);

  const riskContextSelected = useMemo(() => {
    const { unknown, ...rest } = riskContext;
    return Object.values(rest).some(Boolean);
  }, [riskContext]);

  const liRadsContextWarning = useMemo(() => {
    if (!enableLiRads) return null;
    if (!riskContextSelected) return "LI-RADS için uygun klinik bağlam seçilmemiş.";
    return null;
  }, [enableLiRads, riskContextSelected]);

  const selectedDifferentials = useMemo(
    () => differentials.filter((d) => d.enabled),
    [differentials]
  );

  const { hints: autoHints, suggestedDifferentials } = useMemo(
    () =>
      deriveSuggestions({
        hasDynamic,
        arterial,
        portal,
        delayed,
        capsule,
        t2,
        diffusion,
        morphology,
        generalEnh,
        riskContextSelected,
      }),
    [
      hasDynamic,
      arterial,
      portal,
      delayed,
      capsule,
      t2,
      diffusion,
      morphology,
      generalEnh,
      riskContextSelected,
    ]
  );

  const followupSuggestion = useMemo(
    () =>
      deriveFollowupSuggestion({
        sizeMm,
        isDefinitive,
        hasDynamic,
        arterial,
        portal,
        delayed,
        diffusion,
        riskContextSelected,
      }),
    [
      sizeMm,
      isDefinitive,
      hasDynamic,
      arterial,
      portal,
      delayed,
      diffusion,
      riskContextSelected,
    ]
  );

  const descriptionText = useMemo(() => {
    const parts: string[] = [];
    const sz = size?.trim() ? `${size.trim()} ${sizeUnit}` : "boyutu belirtilmemiş";
    parts.push(`Karaciğer segment ${segment} düzeyinde yaklaşık ${sz} ölçülen`);
    parts.push(
      morphology === "solid" ? "solid" : morphology === "cystic" ? "kistik" : "mikst"
    );

    if (densityCT !== "na") {
      parts.push(
        `BT'de ${OPTIONS.densityCT
          .find((x) => x.v === densityCT)
          ?.l.toLowerCase()}`
      );
    }

    const t1l = OPTIONS.t1.find((x) => x.v === t1)?.l;
    const t2l = OPTIONS.t2.find((x) => x.v === t2)?.l;
    if (t1 !== "na") parts.push(`${t1l?.toLowerCase()} sinyalli`);
    if (t2 !== "na") parts.push(`${t2l?.toLowerCase()} sinyalli`);

    parts.push("lezyon izlenmektedir.");
    return parts.join(" ");
  }, [segment, size, sizeUnit, morphology, densityCT, t1, t2]);

  const contrastText = useMemo(() => {
    if (!hasDynamic) {
      const enh = OPTIONS.enhancementGeneral.find((x) => x.v === generalEnh)?.l;
      if (generalEnh === "na") return "Kontrast paternine dair bilgi sınırlıdır.";
      return `Kontrast sonrası ${enh?.toLowerCase()} patern izlenmektedir.`;
    }

    const a =
      arterial === "na"
        ? null
        : `arteriyel fazda ${phaseLabel(arterial).toLowerCase()}`;
    const p =
      portal === "na" ? null : `portal venöz fazda ${phaseLabel(portal).toLowerCase()}`;
    const d =
      delayed === "na" ? null : `gecikme fazında ${phaseLabel(delayed).toLowerCase()}`;

    const parts = [a, p, d].filter(Boolean) as string[];
    const cap =
      capsule === "na"
        ? null
        : capsule === "yes"
          ? "kapsül görünümü izlenmektedir"
          : "kapsül görünümü izlenmemektedir";

    if (parts.length === 0 && !cap)
      return "Dinamik faz değerlendirmesi yapılmamıştır / bilgi sınırlıdır.";

    const base = parts.length
      ? `Dinamik değerlendirmede lezyon ${parts.join(", ")} görünümde izlenmektedir`
      : "Dinamik faz sinyal yoğunlukları belirtilmemiştir";

    return cap ? `${base}; ayrıca ${cap}.` : `${base}.`;
  }, [hasDynamic, generalEnh, arterial, portal, delayed, capsule]);

  const assessmentText = useMemo(() => {
    const conf = OPTIONS.confidence.find((x) => x.v === confidence)?.l;

    const li =
      enableLiRads && liRadsCat !== "na"
        ? ` LI-RADS (opsiyonel): ${liRadsCat}.`
        : enableLiRads
          ? " LI-RADS seçilmemiştir."
          : "";

    const ctxText = enableLiRads
      ? ` Klinik bağlam: ${Object.entries(riskContext)
          .filter(([, v]) => v)
          .map(([k]) => OPTIONS.riskContext.find((x) => x.v === k)?.l)
          .filter(Boolean)
          .join(", ")}.`
      : "";

    if (isDefinitive) {
      return `Mevcut görüntüleme bulguları ${definitiveDx} ile uyumlu olup değerlendirmedeki güven düzeyi: ${conf} olarak belirtilmiştir.${li}${ctxText}`;
    }

    if (selectedDifferentials.length === 0) {
      return `Lezyon için ayırıcı tanı belirtilmemiştir. Klinik korelasyon ve önceki tetkiklerle karşılaştırma önerilir. Değerlendirmedeki güven düzeyi: ${conf}.${li}${ctxText}`;
    }

    const lines: string[] = [];
    lines.push("Mevcut görüntüleme bulguları nonspesifik olup ayırıcı tanıda;");

    if (likelihoodMode === "percent") {
      const enabled = selectedDifferentials
        .slice()
        .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
      const txt = enabled
        .map((d) => {
          const name =
            d.name === "Diğer" && d.note?.trim()
              ? `Diğer (${d.note.trim()})`
              : d.name;
          return `${name} (%${clamp(Math.round(d.percent || 0), 0, 100)})`;
        })
        .join(", ");
      lines.push(`- Olasılık dağılımı: ${txt}.`);
    } else {
      const byLikelihood = (lvl: LikelihoodLevel) =>
        selectedDifferentials
          .filter((d) => d.likelihood === lvl)
          .map((d) =>
            d.name === "Diğer" && d.note?.trim() ? `Diğer (${d.note.trim()})` : d.name
          )
          .join(", ");

      const hi = byLikelihood("high");
      const mid = byLikelihood("medium");
      const lo = byLikelihood("low");

      if (hi) lines.push(`- Yüksek olasılık: ${hi}.`);
      if (mid) lines.push(`- Orta olasılık: ${mid}.`);
      if (lo) lines.push(`- Düşük olasılık: ${lo}.`);
    }

    lines.push(`Değerlendirmedeki güven düzeyi: ${conf}.`);
    if (enableLiRads) lines.push(`${li.trim()}${ctxText}`.trim());

    return lines.filter(Boolean).join("\n");
  }, [
    confidence,
    definitiveDx,
    enableLiRads,
    isDefinitive,
    liRadsCat,
    likelihoodMode,
    riskContext,
    selectedDifferentials,
  ]);

  const followupText = useMemo(() => {
    const base = OPTIONS.followup.find((x) => x.v === followup)?.l;
    const extra = freeRecommendation.trim();
    if (!base) return extra;
    if (!extra) return base;
    return `${base}. ${extra}`;
  }, [followup, freeRecommendation]);

  const finalReport = useMemo(() => {
    const findings = `BULGULAR:\n${descriptionText}\n${contrastText}\n\nEK BULGULAR:\n${extraFindings?.trim() ? extraFindings.trim() : "Belirtilmedi."}`;
    const impression = `DEĞERLENDİRME:\n${assessmentText}\n\nÖNERİ/Takip:\n${followupText}`;
    return `${findings}\n\n${impression}`;
  }, [descriptionText, contrastText, extraFindings, assessmentText, followupText]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finalReport);
    } catch {
      // clipboard may be blocked in preview
    }
  }, [finalReport]);

  const toggleDifferential = useCallback((name: DifferentialItem["name"]) => {
    setDifferentials((prev) =>
      prev.map((d) => (d.name === name ? { ...d, enabled: !d.enabled } : d))
    );
  }, []);

  const setDiffLikelihood = useCallback(
    (name: DifferentialItem["name"], lvl: LikelihoodLevel) => {
      setDifferentials((prev) =>
        prev.map((d) => (d.name === name ? { ...d, likelihood: lvl } : d))
      );
    },
    []
  );

  const setDiffPercent = useCallback(
    (name: DifferentialItem["name"], percent: number) => {
      setDifferentials((prev) =>
        prev.map((d) =>
          d.name === name
            ? { ...d, percent: clamp(Math.round(percent), 0, 100) }
            : d
        )
      );
    },
    []
  );

  const setDiffNote = useCallback((name: DifferentialItem["name"], note: string) => {
    setDifferentials((prev) =>
      prev.map((d) => (d.name === name ? { ...d, note } : d))
    );
  }, []);

  const suggestedByName = useMemo(
    () => new Map(suggestedDifferentials.map((s) => [s.name, s] as const)),
    [suggestedDifferentials]
  );

  const applySuggestedDifferentials = useCallback(() => {
    if (suggestedByName.size === 0) return;
    setDifferentials((prev) => {
      const next = prev.map((d) => {
        const sug = suggestedByName.get(d.name);
        if (!sug) return d;
        return {
          ...d,
          enabled: true,
          likelihood: sug.likelihood ?? d.likelihood,
          percent:
            typeof sug.percent === "number" ? clamp(sug.percent, 0, 100) : d.percent,
        };
      });
      return likelihoodMode === "percent" ? normalizePercents(next) : next;
    });
  }, [suggestedByName, likelihoodMode]);

  const normalizeEnabledPercents = useCallback(() => {
    setDifferentials((prev) => normalizePercents(prev));
  }, []);

  const applyFollowupSuggestion = useCallback(() => {
    setFollowup(followupSuggestion.followup);
  }, [followupSuggestion.followup]);

  const toggleRiskContext = useCallback((k: RiskContext) => {
    setRiskContext((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      if (k !== "unknown" && next[k]) next.unknown = false;
      const anyReal = Object.entries(next)
        .filter(([key]) => key !== "unknown")
        .some(([, v]) => v);
      if (!anyReal) next.unknown = true;
      return next;
    });
  }, []);

  const percentSum = useMemo(() => {
    if (likelihoodMode !== "percent") return null;
    return selectedDifferentials.reduce(
      (a, b) => a + (Number.isFinite(b.percent) ? b.percent : 0),
      0
    );
  }, [likelihoodMode, selectedDifferentials]);

  const percentSumWarning = useMemo(() => {
    if (likelihoodMode !== "percent") return null;
    if (selectedDifferentials.length === 0) return null;
    if (percentSum === null) return null;
    return percentSum === 100 ? null : `Yüzdeler toplamı %${percentSum}. (İdeal: %100)`;
  }, [likelihoodMode, selectedDifferentials.length, percentSum]);

  const canFinalize = useMemo(() => Boolean(segment && morphology), [segment, morphology]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Karaciğer Lezyonu Modülü (MVP)
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Checklist belirsizliği yapılandırır:{" "}
              <span className="font-medium">Tanı koymaz</span>; gözlem + faz paterni +
              olasılık + güven düzeyi üretir.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-4 w-4" /> Mediko-legal uyumlu dil
            </Badge>
            <Button variant="outline" onClick={copyToClipboard} className="gap-2">
              <Copy className="h-4 w-4" /> Raporu Kopyala
            </Button>
          </div>
        </div>

        <Alert className="mt-4">
          <AlertTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Sabit İlke
          </AlertTitle>
          <AlertDescription>
            Bu sistem tanı koymaz. Klinik karar ve sorumluluk raporu düzenleyen hekime aittir.
            Belirsizlik durumunda bulgular yapılandırılmış biçimde tanımlanır, ayırıcı tanı ve
            güven düzeyi raporlanır.
          </AlertDescription>
        </Alert>

        {(autoHints.length > 0 ||
          suggestedDifferentials.length > 0 ||
          Boolean(followupSuggestion.message)) && (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">İpucu Motoru</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {autoHints.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Henüz ipucu üretilmedi.</div>
                ) : (
                  autoHints.map((h, i) => (
                    <div key={i} className="rounded-xl border p-3 text-sm">
                      {h}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Önerilen Ayırıcı Tanılar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedDifferentials.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Öneri yok.</div>
                ) : (
                  <div className="space-y-2">
                    {suggestedDifferentials.slice(0, 6).map((s) => (
                      <div key={s.name} className="rounded-xl border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{s.name}</div>
                          <div className="flex items-center gap-2">
                            {likelihoodMode === "percent" &&
                            typeof s.percent === "number" ? (
                              <Badge variant="outline">%{s.percent}</Badge>
                            ) : s.likelihood ? (
                              <LikelihoodBadge lvl={s.likelihood} />
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{s.why}</div>
                      </div>
                    ))}
                    <Button
                      onClick={applySuggestedDifferentials}
                      className="w-full rounded-xl gap-2"
                    >
                      <Wand2 className="h-4 w-4" /> Önerileri Ayırıcı Tanıya Ekle
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Öneriler otomatik işaretlenir; isterseniz kaldırabilirsiniz.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Takip / İleri Tetkik Önerisi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-xl border p-3 text-sm">{followupSuggestion.message}</div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">
                    Öneri:{" "}
                    {
                      OPTIONS.followup.find((x) => x.v === followupSuggestion.followup)?.l
                    }
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={applyFollowupSuggestion}
                    className="rounded-xl"
                  >
                    Uygula
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Bu yalnızca bir öneridir; klinik bağlam/önceki tetkiklere göre siz belirlersiniz.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>1) Bulguyu Tanımla + Modül Seçimleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Segment</Label>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.segments.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Boyut</Label>
                  <div className="flex gap-2">
                    <Input
                      className="rounded-xl"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="örn. 18"
                      inputMode="decimal"
                    />
                    <Select value={sizeUnit} onValueChange={setSizeUnit}>
                      <SelectTrigger className="w-24 rounded-xl">
                        <SelectValue placeholder="Birim" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPTIONS.sizeUnit.map((o) => (
                          <SelectItem key={o.v} value={o.v}>
                            {o.l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Morfoloji</Label>
                  <Select value={morphology} onValueChange={setMorphology}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.morphology.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>BT Dansite</Label>
                  <Select value={densityCT} onValueChange={setDensityCT}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.densityCT.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>T1</Label>
                  <Select value={t1} onValueChange={setT1}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.t1.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>T2</Label>
                  <Select value={t2} onValueChange={setT2}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.t2.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>DWI</Label>
                  <Select value={diffusion} onValueChange={setDiffusion}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.diffusion.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <div className="text-sm font-medium">Dinamik faz bilgisi var mı?</div>
                  <div className="text-xs text-muted-foreground">
                    Evet ise arteriyel/portal/gecikme seçilir.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs", hasDynamic && "font-medium")}>Evet</span>
                  <Switch checked={hasDynamic} onCheckedChange={setHasDynamic} />
                  <span className={cn("text-xs", !hasDynamic && "font-medium")}>Hayır</span>
                </div>
              </div>

              {hasDynamic ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Arteriyel Faz</Label>
                      <Select value={arterial} onValueChange={setArterial}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPTIONS.phaseIntensity.map((o) => (
                            <SelectItem key={o.v} value={o.v}>
                              {o.l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Portal Venöz Faz</Label>
                      <Select value={portal} onValueChange={setPortal}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPTIONS.phaseIntensity.map((o) => (
                            <SelectItem key={o.v} value={o.v}>
                              {o.l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Gecikme Fazı</Label>
                      <Select value={delayed} onValueChange={setDelayed}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPTIONS.phaseIntensity.map((o) => (
                            <SelectItem key={o.v} value={o.v}>
                              {o.l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Kapsül</Label>
                      <Select value={capsule} onValueChange={setCapsule}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPTIONS.yesNoNA.map((o) => (
                            <SelectItem key={o.v} value={o.v}>
                              {o.l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Genel Patern (opsiyonel)</Label>
                      <Select value={generalEnh} onValueChange={setGeneralEnh}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Seç" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPTIONS.enhancementGeneral.map((o) => (
                            <SelectItem key={o.v} value={o.v}>
                              {o.l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Kontrast Patern (genel)</Label>
                  <Select value={generalEnh} onValueChange={setGeneralEnh}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.enhancementGeneral.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <div className="text-sm font-medium">Kesin tanı koyuyor musunuz?</div>
                  <div className="text-xs text-muted-foreground">
                    Evet seçilirse ayırıcı tanı bölümü kapanır.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs", isDefinitive && "font-medium")}>Evet</span>
                  <Switch checked={isDefinitive} onCheckedChange={setIsDefinitive} />
                  <span className={cn("text-xs", !isDefinitive && "font-medium")}>Hayır</span>
                </div>
              </div>

              {isDefinitive && (
                <div className="space-y-2">
                  <Label>Kesin Tanı</Label>
                  <Select value={definitiveDx} onValueChange={setDefinitiveDx}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Tanı seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.differentials.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Güven Düzeyi</Label>
                  <Select
                    value={confidence}
                    onValueChange={(v) => setConfidence(v as LikelihoodLevel)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.confidence.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Takip/İleri İnceleme</Label>
                  <Select value={followup} onValueChange={setFollowup}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Seç" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTIONS.followup.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <div className="text-sm font-medium">LI-RADS (opsiyonel)</div>
                  <div className="text-xs text-muted-foreground">
                    Riskli karaciğer bağlamında opsiyoneldir.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs", enableLiRads && "font-medium")}>Açık</span>
                  <Switch
                    checked={enableLiRads}
                    onCheckedChange={(v) => {
                      setEnableLiRads(v);
                      if (!v) setLiRadsCat("na");
                    }}
                  />
                  <span className={cn("text-xs", !enableLiRads && "font-medium")}>Kapalı</span>
                </div>
              </div>

              {enableLiRads && (
                <div className="space-y-3">
                  {liRadsContextWarning && (
                    <div className="flex items-start gap-2 rounded-xl border p-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <div>{liRadsContextWarning}</div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>LI-RADS Kategorisi</Label>
                    <Select value={liRadsCat} onValueChange={setLiRadsCat}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPTIONS.liRads.map((o) => (
                          <SelectItem key={o.v} value={o.v}>
                            {o.l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Klinik Bağlam</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {OPTIONS.riskContext.map((r) => (
                        <Button
                          key={r.v}
                          type="button"
                          variant={riskContext[r.v] ? "default" : "outline"}
                          className="justify-start rounded-xl"
                          onClick={() => toggleRiskContext(r.v)}
                        >
                          {r.l}
                        </Button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Not: "Bilinmiyor" seçeneği bağlam hatırlatması için risk sayılmaz.
                    </div>
                  </div>
                </div>
              )}

              {!isDefinitive && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                    <div>
                      <div className="text-sm font-medium">Olasılık biçimi</div>
                      <div className="text-xs text-muted-foreground">
                        Seviye veya % olasılık dağılımı
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs",
                          likelihoodMode === "level" && "font-medium"
                        )}
                      >
                        Seviye
                      </span>
                      <Switch
                        checked={likelihoodMode === "percent"}
                        onCheckedChange={(v) => {
                          const next = v ? "percent" : "level";
                          setLikelihoodMode(next);
                          if (next === "percent") {
                            setDifferentials((prev) => normalizePercents(prev));
                          }
                        }}
                      />
                      <span
                        className={cn(
                          "text-xs",
                          likelihoodMode === "percent" && "font-medium"
                        )}
                      >
                        %
                      </span>
                    </div>
                  </div>

                  {percentSumWarning && (
                    <div className="rounded-xl border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4" />
                          <div>{percentSumWarning}</div>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setDifferentials((prev) => normalizePercents(prev))}
                        >
                          Normalize Et
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Ayırıcı Tanı</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {differentials.map((d) => (
                        <div key={d.name} className="rounded-xl border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium">{d.name}</div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Badge
                                  variant={d.enabled ? "default" : "secondary"}
                                  className="cursor-pointer"
                                  onClick={() => toggleDifferential(d.name)}
                                >
                                  {d.enabled ? "Seçili" : "Seç"}
                                </Badge>
                                {d.enabled && likelihoodMode === "level" && (
                                  <LikelihoodBadge lvl={d.likelihood} />
                                )}
                                {d.enabled && likelihoodMode === "percent" && (
                                  <Badge variant="outline">%{d.percent}</Badge>
                                )}
                              </div>
                            </div>

                            <div className="min-w-[150px]">
                              {likelihoodMode === "level" ? (
                                <Select
                                  value={d.likelihood}
                                  onValueChange={(v) =>
                                    setDifferentials((prev) =>
                                      prev.map((x) =>
                                        x.name === d.name
                                          ? { ...x, likelihood: v as LikelihoodLevel }
                                          : x
                                      )
                                    )
                                  }
                                  disabled={!d.enabled}
                                >
                                  <SelectTrigger className="h-9 rounded-xl">
                                    <SelectValue placeholder="Seç" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {OPTIONS.likelihood.map((o) => (
                                      <SelectItem key={o.v} value={o.v}>
                                        {o.l}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="space-y-1">
                                  <Label className="text-xs">%</Label>
                                  <Input
                                    className="h-9 rounded-xl"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={d.enabled ? d.percent : 0}
                                    disabled={!d.enabled}
                                    onChange={(e) =>
                                      setDifferentials((prev) =>
                                        prev.map((x) =>
                                          x.name === d.name
                                            ? {
                                                ...x,
                                                percent: clamp(
                                                  Math.round(Number(e.target.value)),
                                                  0,
                                                  100
                                                ),
                                              }
                                            : x
                                        )
                                      )
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {d.enabled && d.name === "Diğer" && (
                            <div className="mt-2 space-y-2">
                              <Label className="text-xs">Not</Label>
                              <Input
                                className="h-9 rounded-xl"
                                placeholder="Diğer ön tanı / not"
                                value={d.note || ""}
                                onChange={(e) =>
                                  setDifferentials((prev) =>
                                    prev.map((x) =>
                                      x.name === d.name
                                        ? { ...x, note: e.target.value }
                                        : x
                                    )
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label>Öneri Serbest Metin</Label>
                      <Input
                        className="rounded-xl"
                        value={freeRecommendation}
                        onChange={(e) => setFreeRecommendation(e.target.value)}
                        placeholder="örn. Klinik ve önceki tetkiklerle korelasyon önerilir."
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Ek Bulgular / İnsidental Bulgular</Label>
                <Textarea
                  className="min-h-[110px] rounded-xl"
                  value={extraFindings}
                  onChange={(e) => setExtraFindings(e.target.value)}
                  placeholder="Klinik soru dışı raporlanması gereken ek bulgular..."
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="default"
                  disabled={!canFinalize}
                  onClick={copyToClipboard}
                  className="rounded-xl"
                >
                  Raporu Kopyala
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>2) Rapor Önizleme</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="w-full rounded-xl">
                  <TabsTrigger value="preview" className="flex-1 rounded-xl">
                    Önizleme
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="flex-1 rounded-xl">
                    Ham Metin
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4 space-y-3">
                  <Section title="Bulgular" text={descriptionText} />
                  <Section title="Dinamik / Kontrast" text={contrastText} />
                  <Section
                    title="Ek Bulgular"
                    text={extraFindings?.trim() ? extraFindings.trim() : "Belirtilmedi."}
                  />
                  <Section title="Değerlendirme" text={assessmentText} mono />
                  <Section title="Öneri/Takip" text={followupText} />
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                  <pre className="whitespace-pre-wrap rounded-2xl border p-4 text-sm leading-6">
                    {finalReport}
                  </pre>
                </TabsContent>
              </Tabs>

              <div className="mt-4 rounded-2xl border p-4 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Sabit alt metin</div>
                <div className="mt-1">
                  Bu sistem tanı koymaz. Klinik karar ve sorumluluk raporu düzenleyen hekime aittir.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 text-xs text-muted-foreground">
          © MVP Demo — Karaciğer Lezyonu Belirsizlik Modülü
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  text,
  mono,
}: {
  title: string;
  text: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div
        className={cn(
          "mt-2 text-sm leading-6",
          mono && "whitespace-pre-wrap font-mono text-[13px]"
        )}
      >
        {text}
      </div>
    </div>
  );
}

// Self-tests: validates helpers without an external runner.
function runSelfTests() {
  console.assert(isWashoutLike("hypo", "iso") === true, "washout portal hypo");
  console.assert(isWashoutLike("iso", "hypo") === true, "washout delayed hypo");
  console.assert(isWashoutLike("iso", "iso") === false, "washout iso/iso");

  console.assert(toMm("2.5", "cm") === 25, "toMm 2.5cm");
  console.assert(toMm("2,5", "cm") === 25, "toMm 2,5cm");
  console.assert(toMm("0", "mm") === null, "toMm zero");

  const norm = normalizePercents([
    { name: "Hemanjiom", enabled: true, likelihood: "low", percent: 10 },
    { name: "Metastaz", enabled: true, likelihood: "low", percent: 10 },
    { name: "FNH", enabled: false, likelihood: "low", percent: 80 },
  ]);
  const sum = norm.filter((x) => x.enabled).reduce((a, b) => a + b.percent, 0);
  console.assert(sum === 100, "normalize sum 100");

  const sug = deriveSuggestions({
    hasDynamic: true,
    arterial: "hyper",
    portal: "hypo",
    delayed: "hypo",
    capsule: "yes",
    t2: "hyper",
    diffusion: "no",
    morphology: "solid",
    generalEnh: "na",
    riskContextSelected: true,
  });
  console.assert(sug.hints.length > 0, "hints non-empty");
  console.assert(
    sug.suggestedDifferentials.some((d) => d.name === "HCC"),
    "suggest HCC"
  );

  const f = deriveFollowupSuggestion({
    sizeMm: 25,
    isDefinitive: false,
    hasDynamic: true,
    arterial: "hyper",
    portal: "hypo",
    delayed: "hypo",
    diffusion: "no",
    riskContextSelected: true,
  });
  console.assert(Boolean(f.message), "followup message");
}

try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (globalThis as any)?.process?.env?.NODE_ENV;
  if (env !== "production") runSelfTests();
} catch {
  // ignore
}
<a href="/brain">
  <Button variant="outline">Beyin Modülü</Button>
</a>


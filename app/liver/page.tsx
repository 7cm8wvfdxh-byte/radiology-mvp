"use client";

import React, { useMemo, useState } from "react";

/**
 * Abdomen v1: Karaciğer + Safra Kesesi + Safra Yolları
 * - Strict modality gating:
 *   - CT: hides MR blocks + clears MR inputs + rule engine ignores MR
 *   - MR: hides CT blocks + clears CT inputs + rule engine ignores CT
 *   - CT_MR: both available
 *
 * ⚠️ Klinik karar destek amaçlı demo. Nihai sorumluluk hekimdedir.
 */

// ---------- Types ----------
type YesNoUnk = "YES" | "NO" | "UNK";
type YesNo = "YES" | "NO";
type Modality = "CT" | "MR" | "CT_MR";
type CTPhase = "NC" | "ART" | "PVP" | "DEL" | "MULTI" | "UNKNOWN";

type LiverCount = "SINGLE" | "MULTIPLE";
type Segment =
  | "S1"
  | "S2"
  | "S3"
  | "S4a"
  | "S4b"
  | "S5"
  | "S6"
  | "S7"
  | "S8"
  | "UNK";

type Margin = "SHARP" | "ILL_DEFINED" | "UNK";

type CTAtten = "HYPO" | "ISO" | "HYPER" | "UNK";
type CTEnh =
  | "NONE"
  | "HYPERVASCULAR"
  | "RIM"
  | "PERIPHERAL_NODULAR"
  | "HETEROGENEOUS"
  | "PROGRESSIVE"
  | "WASHOUT"
  | "UNK";

type MRSignal = "HYPO" | "ISO" | "HYPER" | "MIXED" | "UNK";
type InOut = "SIGNAL_DROP" | "NO_DROP" | "UNK";
type Triage = "ROUTINE" | "URGENT" | "STAT";

type InputState = {
  exam: {
    modality: Modality;
    phase_ct: CTPhase;
    mr_sequences: {
      t1: boolean;
      t2: boolean;
      dwi_adc: boolean;
      in_out_phase: boolean;
      dynamic_contrast: boolean;
      hbp: boolean;
    };
  };
  context: {
    known_malignancy: "YES" | "NO" | "UNK";
    cirrhosis: "YES" | "NO" | "UNK";
    fever_infection: YesNo;
    jaundice_cholestasis: YesNo;
  };
  liver: {
    has_lesion: boolean;
    lesion_count: LiverCount;
    largest_size_mm: number;
    segment: Segment;
    margin: Margin;
    capsule_retraction: YesNoUnk;
    biliary_dilatation_adjacent: YesNoUnk;
    fatty_liver: YesNoUnk;
    vascular_invasion: YesNoUnk;
    ct: {
      attenuation_nc: CTAtten;
      enhancement_pattern: CTEnh;
      delayed_fill_in: YesNoUnk;
      washout: YesNoUnk;
    };
    mr: {
      t1_signal: MRSignal;
      t2_signal: MRSignal;
      dwi_restriction: YesNoUnk;
      in_phase_vs_opposed: InOut;
      arterial_hyperenhancement: YesNoUnk;
      washout: YesNoUnk;
      capsule: YesNoUnk;
      hbp_hypointense: YesNoUnk;
    };
  };
  gallbladder: {
    has_pathology: boolean;
    stones: YesNoUnk;
    wall_thickening_mm: number;
    pericholecystic_fluid: YesNoUnk;
    distension: YesNoUnk;
    sludge: YesNoUnk;
    polyp_mm: number;
  };
  bileduct: {
    has_pathology: boolean;
    ihd_dilatation: YesNoUnk;
    ehd_dilatation: YesNoUnk;
    cbd_mm: number;
    stone_suspected: YesNoUnk;
    abrupt_cutoff: YesNoUnk;
    stent_present: YesNoUnk;
    pneumobilia: YesNoUnk;
  };
};

type EvalResult = {
  triage: Triage;
  impressions: string[]; // ordered
  differentials: string[];
  nextLook: string[];
  reportSentence: string;
  warnings: string[];
};

// ---------- Helpers ----------
function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}
function clampNum(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function modalityToTr(m: Modality) {
  if (m === "CT") return "BT";
  if (m === "MR") return "MR";
  return "BT + MR";
}
function triageBadge(t: Triage) {
  if (t === "STAT") return { text: "STAT", bg: "#991b1b", fg: "white" };
  if (t === "URGENT") return { text: "ACİL", bg: "#9a3412", fg: "white" };
  return { text: "RUTİN", bg: "#065f46", fg: "white" };
}

// ---------- Strict modality cleanup ----------
function clearCT(s: InputState): InputState {
  return {
    ...s,
    exam: { ...s.exam, phase_ct: "UNKNOWN" },
    liver: {
      ...s.liver,
      ct: {
        attenuation_nc: "UNK",
        enhancement_pattern: "UNK",
        delayed_fill_in: "UNK",
        washout: "UNK",
      },
    },
  };
}
function clearMR(s: InputState): InputState {
  return {
    ...s,
    exam: {
      ...s.exam,
      mr_sequences: {
        t1: false,
        t2: false,
        dwi_adc: false,
        in_out_phase: false,
        dynamic_contrast: false,
        hbp: false,
      },
    },
    liver: {
      ...s.liver,
      mr: {
        t1_signal: "UNK",
        t2_signal: "UNK",
        dwi_restriction: "UNK",
        in_phase_vs_opposed: "UNK",
        arterial_hyperenhancement: "UNK",
        washout: "UNK",
        capsule: "UNK",
        hbp_hypointense: "UNK",
      },
    },
  };
}
function applyModalityStrict(s: InputState, modality: Modality): InputState {
  let next = { ...s, exam: { ...s.exam, modality } };
  if (modality === "CT") {
    next = clearMR(next);
    // CT mode: keep CT phase as-is (or set to PVP default if UNKNOWN)
    if (next.exam.phase_ct === "UNKNOWN") next.exam.phase_ct = "PVP";
  } else if (modality === "MR") {
    next = clearCT(next);
    // MR mode: set MR sequences to a reasonable default on first switch
    const allFalse = Object.values(next.exam.mr_sequences).every((v) => v === false);
    if (allFalse) {
      next.exam.mr_sequences = {
        t1: true,
        t2: true,
        dwi_adc: true,
        in_out_phase: false,
        dynamic_contrast: true,
        hbp: false,
      };
    }
  } else {
    // CT_MR: keep everything; if both cleared before, set defaults
    if (next.exam.phase_ct === "UNKNOWN") next.exam.phase_ct = "PVP";
    const allFalse = Object.values(next.exam.mr_sequences).every((v) => v === false);
    if (allFalse) {
      next.exam.mr_sequences = {
        t1: true,
        t2: true,
        dwi_adc: true,
        in_out_phase: false,
        dynamic_contrast: true,
        hbp: false,
      };
    }
  }
  return next;
}

// ---------- Rule Engine (strict: uses only enabled modality data) ----------
function evaluateLiverBiliary(input: InputState): EvalResult {
  const { exam, context, liver, gallbladder, bileduct } = input;

  const impressions: string[] = [];
  const differentials: string[] = [];
  const nextLook: string[] = [];
  const warnings: string[] = [];

  let triage: Triage = "ROUTINE";

  const hasCT = exam.modality === "CT" || exam.modality === "CT_MR";
  const hasMR = exam.modality === "MR" || exam.modality === "CT_MR";

  // -----------------
  // LIVER
  // -----------------
  if (liver.has_lesion) {
    const size = clampNum(liver.largest_size_mm || 0, 0, 500);
    const malign = context.known_malignancy;
    const cirr = context.cirrhosis;

    // --- CT-only flags ---
    const ctHemangPattern =
      hasCT &&
      liver.ct.enhancement_pattern === "PERIPHERAL_NODULAR" &&
      (liver.ct.delayed_fill_in === "YES" || exam.phase_ct === "DEL" || exam.phase_ct === "MULTI");

    const simpleCystCT =
      hasCT &&
      liver.ct.attenuation_nc === "HYPO" &&
      (liver.ct.enhancement_pattern === "NONE" || liver.ct.enhancement_pattern === "UNK");

    const abscessLikelyCT =
      hasCT && context.fever_infection === "YES" && liver.ct.enhancement_pattern === "RIM";

    const metastasisLikelyCT =
      hasCT &&
      (liver.ct.enhancement_pattern === "RIM" ||
        (malign === "YES" && liver.lesion_count === "MULTIPLE"));

    const hccLikelyCT =
      hasCT &&
      cirr === "YES" &&
      (liver.ct.washout === "YES" &&
        (liver.ct.enhancement_pattern === "HYPERVASCULAR" || liver.ct.enhancement_pattern === "WASHOUT"));

    // --- MR-only flags ---
    const mrHemangPattern =
      hasMR &&
      (liver.mr.t2_signal === "HYPER" || liver.mr.t2_signal === "MIXED") &&
      liver.mr.washout !== "YES" &&
      liver.mr.dwi_restriction !== "YES" &&
      (liver.mr.arterial_hyperenhancement === "YES" || exam.mr_sequences.dynamic_contrast);

    const simpleCystMR =
      hasMR &&
      liver.mr.t1_signal === "HYPO" &&
      liver.mr.t2_signal === "HYPER" &&
      liver.mr.dwi_restriction !== "YES" &&
      liver.mr.arterial_hyperenhancement !== "YES" &&
      liver.mr.washout !== "YES";

    const abscessLikelyMR =
      hasMR &&
      context.fever_infection === "YES" &&
      liver.mr.dwi_restriction === "YES" &&
      (liver.mr.arterial_hyperenhancement === "YES" || exam.mr_sequences.dynamic_contrast);

    const metastasisLikelyMR =
      hasMR &&
      ((malign === "YES" && liver.lesion_count === "MULTIPLE") ||
        (liver.mr.dwi_restriction === "YES" && liver.lesion_count === "MULTIPLE"));

    const hccLikelyMR =
      hasMR &&
      cirr === "YES" &&
      (
        (liver.mr.arterial_hyperenhancement === "YES" && liver.mr.washout === "YES") ||
        (liver.mr.hbp_hypointense === "YES" && liver.mr.arterial_hyperenhancement === "YES")
      );

    const fnhLikelyMR =
      hasMR &&
      liver.mr.arterial_hyperenhancement === "YES" &&
      liver.mr.washout !== "YES" &&
      liver.mr.dwi_restriction !== "YES" &&
      (exam.mr_sequences.hbp ? liver.mr.hbp_hypointense !== "YES" : true);

    const adenomaPossibleMR =
      hasMR &&
      liver.mr.arterial_hyperenhancement === "YES" &&
      liver.mr.in_phase_vs_opposed === "SIGNAL_DROP";

    // Priority (same as before, but strictly separated)
    if (simpleCystCT || simpleCystMR) {
      impressions.push("Karaciğer lezyonu: Basit kist ile uyumlu görünüm.");
      differentials.push("Biliyer hamartom (çoklu küçük kistler)", "Atipik/komplike kist (protein/kanama içerikli)");
      nextLook.push(
        "Kontrast tutulumu var mı? (basit kistte beklenmez)",
        "Duvar/septasyon/nodül varlığı (komplike kist lehine)",
        "DWI restriksiyon yokluğu (varsa kist lehine)"
      );
    } else if (ctHemangPattern || mrHemangPattern) {
      impressions.push("Karaciğer lezyonu: Hemanjiyom lehine tipik kontrastlanma paterni.");
      differentials.push("Hipervasküler metastaz (atipik olgularda)", "HCC (özellikle siroz zemini varsa)", "FNH");
      nextLook.push(
        "Periferik nodüler tutulum + gecikmiş dolum (fill-in) (hemanjiyom lehine)",
        "MR T2 belirgin hiper sinyal (light-bulb) (hemanjiyom lehine)",
        "Rim tutulum/çoklu odak/restriksiyon varsa metastaz ayırıcıda"
      );
    } else if (abscessLikelyCT || abscessLikelyMR) {
      impressions.push("Karaciğer lezyonu: Abse/enfeksiyon lehine (klinik ile uyumlu ise).");
      triage = "URGENT";
      warnings.push("Enfeksiyon/abse olasılığı: Klinik ve laboratuvar korelasyonu, uygun ise acil değerlendirme önerilir.");
      differentials.push("Nekrotik metastaz", "Nekrotik HCC", "Biloma");
      nextLook.push(
        "Rim kontrastlanma + belirgin DWI restriksiyonu (abse lehine)",
        "Gaz odakları/sıvı-seviye (varsa abse lehine)",
        "Ateş-lökositoz-CRP ile korelasyon"
      );
    } else if (hccLikelyCT || hccLikelyMR) {
      impressions.push("Karaciğer lezyonu: Siroz zemini + arteriyel hiperenhancement/washout bulguları ile HCC lehine.");
      triage = "URGENT";
      warnings.push("HCC lehine patern: Klinik ve önceki tetkiklerle korelasyon, uygun ise hepatoloji/onkoloji değerlendirmesi önerilir.");
      differentials.push("Displastik nodül", "Hipervasküler metastaz", "Kolanjiyokarsinom (atipik)");
      nextLook.push(
        "Arteriyel hiperenhancement + portal/geç faz washout + kapsül",
        "Vasküler invazyon / portal ven trombüsü var mı?",
        "HBP varsa hipointensite HCC lehine destekleyici"
      );
    } else if (metastasisLikelyCT || metastasisLikelyMR) {
      impressions.push("Karaciğer lezyonu: Metastaz lehine (malignite öyküsü/çoklu odak/rim tutulum varlığında).");
      triage = "URGENT";
      differentials.push("HCC (sirozda)", "Kolanjiyokarsinom", "Atipik hemanjiyom");
      nextLook.push(
        "Lezyon sayısı (multiplite) ve target/rim paterni",
        "DWI restriksiyon (varsa metastaz lehine)",
        "Primer malignite öyküsü ve sistemik tarama ile korelasyon"
      );
    } else if (fnhLikelyMR) {
      impressions.push("Karaciğer lezyonu: FNH lehine (MR dinamik özellikleri ile uyumlu ise).");
      differentials.push("Hepatik adenom", "Hipervasküler metastaz", "Atipik hemanjiyom");
      nextLook.push(
        "Santral skar (varsa FNH lehine)",
        "HBP varsa: FNH sıklıkla izo/hiper; adenom çoğunlukla hipo",
        "Yağ içeriği: in/out phase drop adenom lehine olabilir"
      );
    } else if (adenomaPossibleMR) {
      impressions.push("Karaciğer lezyonu: Hepatik adenom olası (in/out phase yağ içeriği ile uyumlu ise).");
      differentials.push("FNH", "Hipervasküler metastaz", "HCC (yüksek riskli zeminde)");
      nextLook.push(
        "In/out phase sinyal düşüşü (intralezyonel yağ)",
        "Kanama/nekroz (adenomda olabilir)",
        "HBP varsa genellikle hipointens"
      );
    } else {
      impressions.push("Karaciğer lezyonu: Spesifik değil; görüntüleme bulgularına göre ileri karakterizasyon önerilir.");
      differentials.push("Hemanjiom (atipik)", "Metastaz", "HCC", "FNH/Adenom", "Abse (klinik uyumda)");
      nextLook.push(
        "Dinamik kontrast paterni (arteriyel/portal/geç faz)",
        "DWI/ADC restriksiyonu",
        "Siroz veya malignite öyküsü"
      );
    }

    if (size >= 20) nextLook.push("Boyut ≥2 cm: karakterizasyon ve klinik korelasyon önemlidir; uygun ise ileri inceleme/izlem önerilir.");

    if (liver.vascular_invasion === "YES") {
      triage = "STAT";
      warnings.push("Vasküler invazyon şüphesi: STAT öncelik önerilir.");
      nextLook.push("Portal/hepatik ven trombüsü ve arteriyel faz ilişkisini değerlendir.");
    }
  } else {
    impressions.push("Karaciğerde belirgin fokal lezyon seçilmedi (mevcut işaretlemeye göre).");
  }

  // -----------------
  // GALLBLADDER
  // -----------------
  if (gallbladder.has_pathology) {
    const wall = clampNum(gallbladder.wall_thickening_mm || 0, 0, 30);
    const polyp = clampNum(gallbladder.polyp_mm || 0, 0, 50);

    const acuteChole =
      (gallbladder.stones === "YES" || gallbladder.sludge === "YES") &&
      (wall >= 4 || gallbladder.pericholecystic_fluid === "YES" || gallbladder.distension === "YES");

    if (acuteChole) {
      impressions.push("Safra kesesi: Akut kolesistit lehine bulgular (klinik ile uyumlu ise).");
      triage = triage === "STAT" ? "STAT" : "URGENT";
      warnings.push("Kolesistit şüphesi: Klinik-lab korelasyonu ve uygun ise acil cerrahi değerlendirme önerilir.");
      differentials.push("Kronik kolesistit", "Acalculous kolesistit", "Hepatit/konjestif nedenli duvar kalınlaşması");
      nextLook.push("Taş + duvar kalınlaşması + perikolesistik sıvı/distansiyon birlikteliği kolesistit lehinedir.");
    } else if (gallbladder.stones === "YES") {
      impressions.push("Safra kesesi: Kolelitiazis (taş) izlenmektedir.");
      nextLook.push("Duvar kalınlaşması/perikolesistik sıvı eşlik ediyorsa kolesistit açısından değerlendir.");
    } else if (gallbladder.sludge === "YES") {
      impressions.push("Safra kesesi: Sludge ile uyumlu içerik izlenmektedir.");
      differentials.push("Mikrolitiyazis", "Hemobilia (klinik uyumda)");
      nextLook.push("Koledok taşı açısından safra yollarını değerlendir.");
    }

    if (polyp > 0) {
      if (polyp >= 10) {
        impressions.push(`Safra kesesi: ${polyp} mm polipoid lezyon (≥10 mm) – malignite riski artabilir.`);
        triage = triage === "STAT" ? "STAT" : "URGENT";
        warnings.push("Polip ≥10 mm: Cerrahi/gastroenteroloji değerlendirmesi düşünülmelidir.");
        nextLook.push("Önceki tetkiklerle boyut/büyüme karşılaştırması yap.");
      } else if (polyp >= 6) {
        impressions.push(`Safra kesesi: ${polyp} mm polipoid lezyon – takip önerilebilir (risklere göre).`);
      } else {
        impressions.push(`Safra kesesi: ${polyp} mm küçük polipoid lezyon – düşük risk (uygun ise takip).`);
      }
    }
  } else {
    impressions.push("Safra kesesi patolojisi seçilmedi (mevcut işaretlemeye göre).");
  }

  // -----------------
  // BILE DUCT
  // -----------------
  if (bileduct.has_pathology) {
    const cbd = clampNum(bileduct.cbd_mm || 0, 0, 30);
    const cbdDilated = cbd >= 7 || bileduct.ehd_dilatation === "YES";
    const cholestaticContext = context.jaundice_cholestasis === "YES";

    if (bileduct.stent_present === "YES") impressions.push("Safra yolları: Stent izlenmektedir.");
    if (bileduct.pneumobilia === "YES") impressions.push("Safra yolları: Pneumobilia izlenmektedir (stent/sfinkterotomi sonrası beklenebilir).");

    const cbdStoneLikely =
      cbdDilated && (bileduct.stone_suspected === "YES" || (bileduct.abrupt_cutoff !== "YES" && bileduct.stone_suspected !== "NO"));

    const obstructionLikely =
      bileduct.abrupt_cutoff === "YES" ||
      (bileduct.ihd_dilatation === "YES" && bileduct.ehd_dilatation === "YES" && bileduct.stone_suspected !== "YES");

    if (cbdStoneLikely) {
      impressions.push("Safra yolları: Koledok taşı lehine (CBD dilatasyon +/- dolma defekti şüphesi).");
      triage = triage === "STAT" ? "STAT" : (cholestaticContext ? "URGENT" : "ROUTINE");
      differentials.push("Koledok striktürü", "Tümöral obstrüksiyon");
      nextLook.push("MRCP/EUS/ERCP (klinik uyuma göre) ile doğrulama/tedavi planı değerlendirilebilir.");
      if (cholestaticContext) warnings.push("Sarılık/kolestaz varlığında koledok taşı/obstrüksiyon öncelikli değerlendirilmelidir.");
    } else if (obstructionLikely) {
      impressions.push("Safra yolları: Obstrüksiyon paterni (abrupt cutoff/dilatasyon) – striktür/tümöral obstrüksiyon olası.");
      triage = triage === "STAT" ? "STAT" : (cholestaticContext ? "URGENT" : "ROUTINE");
      differentials.push("Kolanjiyokarsinom", "Pankreas başı kitle", "Postoperatif striktür", "Taş (atipik)");
      nextLook.push("Obstrüksiyon seviyesi (hiler vs distal), eşlik eden kitle/LAP, MRCP/kontrastlı inceleme korelasyonu.");
      if (cholestaticContext) warnings.push("Kolestaz eşlik ediyorsa acil gastroenteroloji değerlendirmesi düşünülebilir.");
    } else if (cbdDilated || bileduct.ihd_dilatation === "YES") {
      impressions.push("Safra yolları: Dilatasyon izlenmektedir (klinik-lab korelasyon önerilir).");
      differentials.push("Geçirilmiş taş düşürme", "Sfinkter disfonksiyonu", "Striktür");
      nextLook.push("CBD çapı yaş/cerrahi öykü ile birlikte değerlendirilmelidir.");
    }
  } else {
    impressions.push("Safra yolu patolojisi seçilmedi (mevcut işaretlemeye göre).");
  }

  // Report sentence
  const reportSentence = buildReportSentence(input, uniq(impressions), uniq(differentials), triage);

  return {
    triage,
    impressions: uniq(impressions),
    differentials: uniq(differentials),
    nextLook: uniq(nextLook),
    reportSentence,
    warnings: uniq(warnings),
  };
}

function buildReportSentence(input: InputState, impressions: string[], diffs: string[], triage: Triage) {
  const { exam, liver, gallbladder, bileduct } = input;

  const parts: string[] = [];
  parts.push(`${modalityToTr(exam.modality)} incelemede`);

  if (liver.has_lesion) {
    const seg = liver.segment !== "UNK" ? `, ${liver.segment} segmentte` : "";
    const sz = liver.largest_size_mm ? ` ${clampNum(liver.largest_size_mm, 0, 500)} mm` : "";
    parts.push(` karaciğerde${seg}${sz} boyutlu lezyon izlenmiştir`);
  }

  if (gallbladder.has_pathology) {
    const gbBits: string[] = [];
    if (gallbladder.stones === "YES") gbBits.push("taş");
    if (gallbladder.sludge === "YES") gbBits.push("sludge");
    if ((gallbladder.wall_thickening_mm || 0) >= 4) gbBits.push("duvar kalınlaşması");
    if (gallbladder.pericholecystic_fluid === "YES") gbBits.push("perikolesistik sıvı");
    if (gbBits.length) parts.push(`, safra kesesinde ${gbBits.join(" + ")} bulguları mevcuttur`);
    if ((gallbladder.polyp_mm || 0) > 0) parts.push(`, safra kesesinde ${gallbladder.polyp_mm} mm polipoid lezyon izlenmiştir`);
  }

  if (bileduct.has_pathology) {
    const bdBits: string[] = [];
    if ((bileduct.cbd_mm || 0) > 0) bdBits.push(`CBD ~${bileduct.cbd_mm} mm`);
    if (bileduct.ihd_dilatation === "YES") bdBits.push("intrahepatik dilatasyon");
    if (bileduct.ehd_dilatation === "YES") bdBits.push("ekstrahepatik dilatasyon");
    if (bileduct.stone_suspected === "YES") bdBits.push("taş şüphesi");
    if (bileduct.abrupt_cutoff === "YES") bdBits.push("abrupt cutoff");
    if (bileduct.stent_present === "YES") bdBits.push("stent");
    if (bileduct.pneumobilia === "YES") bdBits.push("pnömobili");
    if (bdBits.length) parts.push(`, safra yollarında ${bdBits.join(", ")} izlenmiştir`);
  }

  const top = impressions[0] || "spesifik olmayan bulgular";
  const diff = diffs.slice(0, 4);

  let sentence = parts.join("") + ". ";
  sentence += `Görüntüleme bulguları öncelikle ${top
    .replace("Karaciğer lezyonu:", "")
    .replace("Safra kesesi:", "")
    .replace("Safra yolları:", "")
    .trim()} ile uyumludur. `;

  if (diff.length) sentence += `Ayırıcı tanıda ${diff.join(", ")} değerlendirilebilir. `;

  if (triage !== "ROUTINE") {
    sentence += `Klinik ve laboratuvar ile korelasyonla ${triage === "STAT" ? "ivedi" : "öncelikli"} değerlendirme önerilir.`;
  } else {
    sentence += "Klinik ve önceki tetkiklerle korelasyon önerilir.";
  }

  return sentence.trim();
}

// ---------- UI ----------
const defaultState: InputState = {
  exam: {
    modality: "CT",
    phase_ct: "PVP",
    mr_sequences: {
      t1: true,
      t2: true,
      dwi_adc: true,
      in_out_phase: false,
      dynamic_contrast: true,
      hbp: false,
    },
  },
  context: {
    known_malignancy: "UNK",
    cirrhosis: "UNK",
    fever_infection: "NO",
    jaundice_cholestasis: "NO",
  },
  liver: {
    has_lesion: true,
    lesion_count: "SINGLE",
    largest_size_mm: 18,
    segment: "S7",
    margin: "SHARP",
    capsule_retraction: "UNK",
    biliary_dilatation_adjacent: "UNK",
    fatty_liver: "UNK",
    vascular_invasion: "UNK",
    ct: {
      attenuation_nc: "HYPO",
      enhancement_pattern: "PERIPHERAL_NODULAR",
      delayed_fill_in: "YES",
      washout: "NO",
    },
    mr: {
      t1_signal: "HYPO",
      t2_signal: "HYPER",
      dwi_restriction: "NO",
      in_phase_vs_opposed: "UNK",
      arterial_hyperenhancement: "YES",
      washout: "NO",
      capsule: "NO",
      hbp_hypointense: "UNK",
    },
  },
  gallbladder: {
    has_pathology: false,
    stones: "UNK",
    wall_thickening_mm: 0,
    pericholecystic_fluid: "UNK",
    distension: "UNK",
    sludge: "UNK",
    polyp_mm: 0,
  },
  bileduct: {
    has_pathology: false,
    ihd_dilatation: "UNK",
    ehd_dilatation: "UNK",
    cbd_mm: 0,
    stone_suspected: "UNK",
    abrupt_cutoff: "UNK",
    stent_present: "UNK",
    pneumobilia: "UNK",
  },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>{children}</div>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>{children}</div>;
}
function Col({ span, children }: { span: number; children: React.ReactNode }) {
  return <div style={{ gridColumn: `span ${span} / span ${span}` }}>{children}</div>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, background: "white" }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.2)",
        background: "white",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.2)",
        background: checked ? "rgba(16,185,129,0.15)" : "white",
        textAlign: "left",
        cursor: "pointer",
      }}
      title="Var/Yok"
    >
      <span style={{ fontWeight: 700 }}>{checked ? "Var" : "Yok"}</span>
      <span style={{ opacity: 0.7 }}> — {label}</span>
    </button>
  );
}
function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.2)",
      }}
    />
  );
}

export default function Page() {
  const [state, setState] = useState<InputState>(defaultState);
  const [result, setResult] = useState<EvalResult | null>(null);

  const hasCT = state.exam.modality === "CT" || state.exam.modality === "CT_MR";
  const hasMR = state.exam.modality === "MR" || state.exam.modality === "CT_MR";

  const triageUI = result ? triageBadge(result.triage) : null;

  function update<K extends keyof InputState>(key: K, value: InputState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onModalityChange(m: Modality) {
    setState((prev) => applyModalityStrict(prev, m));
    setResult(null);
  }

  function runEval() {
    const r = evaluateLiverBiliary(state);
    setResult(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setState(defaultState);
    setResult(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "rgba(0,0,0,0.04)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Abdomen AI Yardımcı Ajan (v1) — Karaciğer + Safra (Strict BT/MR)
            </div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              BT seçilince MR tamamen gizlenir ve MR alanları temizlenir. MR seçilince BT aynı şekilde temizlenir.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={runEval}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "white",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Değerlendir
            </button>
            <button
              onClick={reset}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "white",
                cursor: "pointer",
              }}
            >
              Sıfırla
            </button>
          </div>
        </div>

        {result && (
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, background: "white", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Sonuç</div>
              {triageUI && (
                <span style={{ padding: "6px 10px", borderRadius: 999, background: triageUI.bg, color: triageUI.fg, fontWeight: 800, fontSize: 12 }}>
                  {triageUI.text}
                </span>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Ön tanı / İzlenim</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {result.impressions.map((x, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            {result.differentials.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Ayırıcı tanılar</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.differentials.map((d, i) => (
                    <span key={i} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.15)", background: "rgba(0,0,0,0.02)", fontSize: 13 }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.nextLook.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Ayırt ettiren ipuçları / Next-look</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.nextLook.map((x, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Uyarılar</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.warnings.map((x, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Hazır tek cümle (kopyala-yapıştır)</div>
              <textarea
                readOnly
                value={result.reportSentence}
                style={{
                  width: "100%",
                  minHeight: 90,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "rgba(0,0,0,0.02)",
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <Card title="1) İnceleme & Klinik Zemin">
            <Row>
              <Col span={4}>
                <FieldLabel>İnceleme tipi</FieldLabel>
                <Select<Modality>
                  value={state.exam.modality}
                  onChange={onModalityChange}
                  options={[
                    { value: "CT", label: "BT (MR gizlenir + temizlenir)" },
                    { value: "MR", label: "MR (BT gizlenir + temizlenir)" },
                    { value: "CT_MR", label: "BT + MR" },
                  ]}
                />
              </Col>

              {hasCT && (
                <Col span={4}>
                  <FieldLabel>BT faz</FieldLabel>
                  <Select<CTPhase>
                    value={state.exam.phase_ct}
                    onChange={(v) => update("exam", { ...state.exam, phase_ct: v })}
                    options={[
                      { value: "NC", label: "Nonkontrast" },
                      { value: "ART", label: "Arteriyel" },
                      { value: "PVP", label: "Portal venöz" },
                      { value: "DEL", label: "Geç faz" },
                      { value: "MULTI", label: "Çok fazlı" },
                      { value: "UNKNOWN", label: "Bilinmiyor" },
                    ]}
                  />
                </Col>
              )}

              {hasMR && (
                <Col span={4}>
                  <FieldLabel>MR sekanslar (varsa işaretle)</FieldLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {[
                      ["t1", "T1"],
                      ["t2", "T2"],
                      ["dwi_adc", "DWI/ADC"],
                      ["in_out_phase", "In/Out phase"],
                      ["dynamic_contrast", "Dinamik kontrast"],
                      ["hbp", "HBP (gadoxetate)"],
                    ].map(([k, label]) => (
                      <label
                        key={k}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          padding: "8px 10px",
                          border: "1px solid rgba(0,0,0,0.15)",
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.02)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(state.exam.mr_sequences as any)[k]}
                          onChange={(e) =>
                            update("exam", {
                              ...state.exam,
                              mr_sequences: { ...state.exam.mr_sequences, [k]: e.target.checked },
                            })
                          }
                        />
                        <span style={{ fontSize: 13 }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </Col>
              )}
            </Row>

            <div style={{ height: 12 }} />

            <Row>
              <Col span={3}>
                <FieldLabel>Malignite öyküsü</FieldLabel>
                <Select<"YES" | "NO" | "UNK">
                  value={state.context.known_malignancy}
                  onChange={(v) => update("context", { ...state.context, known_malignancy: v })}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </Col>
              <Col span={3}>
                <FieldLabel>Siroz / kronik KC</FieldLabel>
                <Select<"YES" | "NO" | "UNK">
                  value={state.context.cirrhosis}
                  onChange={(v) => update("context", { ...state.context, cirrhosis: v })}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </Col>
              <Col span={3}>
                <FieldLabel>Ateş / enfeksiyon</FieldLabel>
                <Select<YesNo>
                  value={state.context.fever_infection}
                  onChange={(v) => update("context", { ...state.context, fever_infection: v })}
                  options={[
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </Col>
              <Col span={3}>
                <FieldLabel>Sarılık / kolestaz</FieldLabel>
                <Select<YesNo>
                  value={state.context.jaundice_cholestasis}
                  onChange={(v) => update("context", { ...state.context, jaundice_cholestasis: v })}
                  options={[
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </Col>
            </Row>
          </Card>

          <Card title="2) Karaciğer (Parankim & Lezyon)">
            <Row>
              <Col span={4}>
                <FieldLabel>Karaciğerde lezyon</FieldLabel>
                <Toggle checked={state.liver.has_lesion} onChange={(v) => update("liver", { ...state.liver, has_lesion: v })} label="Lezyon var/yok" />
              </Col>
              <Col span={4}>
                <FieldLabel>Yağlı karaciğer</FieldLabel>
                <Select<YesNoUnk>
                  value={state.liver.fatty_liver}
                  onChange={(v) => update("liver", { ...state.liver, fatty_liver: v })}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </Col>
              <Col span={4}>
                <FieldLabel>Vasküler invazyon</FieldLabel>
                <Select<YesNoUnk>
                  value={state.liver.vascular_invasion}
                  onChange={(v) => update("liver", { ...state.liver, vascular_invasion: v })}
                  options={[
                    { value: "UNK", label: "Bilinmiyor" },
                    { value: "NO", label: "Yok" },
                    { value: "YES", label: "Var" },
                  ]}
                />
              </Col>
            </Row>

            {state.liver.has_lesion && (
              <>
                <div style={{ height: 12 }} />
                <Row>
                  <Col span={3}>
                    <FieldLabel>Lezyon sayısı</FieldLabel>
                    <Select<LiverCount>
                      value={state.liver.lesion_count}
                      onChange={(v) => update("liver", { ...state.liver, lesion_count: v })}
                      options={[
                        { value: "SINGLE", label: "Tek" },
                        { value: "MULTIPLE", label: "Çoklu" },
                      ]}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>En büyük boyut (mm)</FieldLabel>
                    <NumberInput
                      value={state.liver.largest_size_mm}
                      onChange={(v) => update("liver", { ...state.liver, largest_size_mm: clampNum(v, 0, 500) })}
                      min={0}
                      max={500}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Segment</FieldLabel>
                    <Select<Segment>
                      value={state.liver.segment}
                      onChange={(v) => update("liver", { ...state.liver, segment: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "S1", label: "S1" },
                        { value: "S2", label: "S2" },
                        { value: "S3", label: "S3" },
                        { value: "S4a", label: "S4a" },
                        { value: "S4b", label: "S4b" },
                        { value: "S5", label: "S5" },
                        { value: "S6", label: "S6" },
                        { value: "S7", label: "S7" },
                        { value: "S8", label: "S8" },
                      ]}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Sınır</FieldLabel>
                    <Select<Margin>
                      value={state.liver.margin}
                      onChange={(v) => update("liver", { ...state.liver, margin: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "SHARP", label: "Düzgün" },
                        { value: "ILL_DEFINED", label: "Düzensiz" },
                      ]}
                    />
                  </Col>
                </Row>

                {hasCT && (
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12, marginTop: 12 }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>BT (aktif)</div>
                    <Row>
                      <Col span={3}>
                        <FieldLabel>Nonkontrast dansite</FieldLabel>
                        <Select<CTAtten>
                          value={state.liver.ct.attenuation_nc}
                          onChange={(v) => update("liver", { ...state.liver, ct: { ...state.liver.ct, attenuation_nc: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "HYPO", label: "Hipodens" },
                            { value: "ISO", label: "İzodens" },
                            { value: "HYPER", label: "Hiperdens" },
                          ]}
                        />
                      </Col>
                      <Col span={5}>
                        <FieldLabel>Kontrastlanma paterni</FieldLabel>
                        <Select<CTEnh>
                          value={state.liver.ct.enhancement_pattern}
                          onChange={(v) => update("liver", { ...state.liver, ct: { ...state.liver.ct, enhancement_pattern: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NONE", label: "Tutulum yok" },
                            { value: "PERIPHERAL_NODULAR", label: "Periferik nodüler" },
                            { value: "HYPERVASCULAR", label: "Hipervasküler (arteriyel)" },
                            { value: "RIM", label: "Rim tutulum" },
                            { value: "PROGRESSIVE", label: "Progresif tutulum" },
                            { value: "HETEROGENEOUS", label: "Heterojen" },
                            { value: "WASHOUT", label: "Washout paterni" },
                          ]}
                        />
                      </Col>
                      <Col span={2}>
                        <FieldLabel>Geç dolum (fill-in)</FieldLabel>
                        <Select<YesNoUnk>
                          value={state.liver.ct.delayed_fill_in}
                          onChange={(v) => update("liver", { ...state.liver, ct: { ...state.liver.ct, delayed_fill_in: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NO", label: "Yok" },
                            { value: "YES", label: "Var" },
                          ]}
                        />
                      </Col>
                      <Col span={2}>
                        <FieldLabel>Washout</FieldLabel>
                        <Select<YesNoUnk>
                          value={state.liver.ct.washout}
                          onChange={(v) => update("liver", { ...state.liver, ct: { ...state.liver.ct, washout: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NO", label: "Yok" },
                            { value: "YES", label: "Var" },
                          ]}
                        />
                      </Col>
                    </Row>
                  </div>
                )}

                {hasMR && (
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 12, marginTop: 12 }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>MR (aktif)</div>
                    <Row>
                      <Col span={3}>
                        <FieldLabel>T1 sinyal</FieldLabel>
                        <Select<MRSignal>
                          value={state.liver.mr.t1_signal}
                          onChange={(v) => update("liver", { ...state.liver, mr: { ...state.liver.mr, t1_signal: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "HYPO", label: "Hipo" },
                            { value: "ISO", label: "İzo" },
                            { value: "HYPER", label: "Hiper" },
                            { value: "MIXED", label: "Miks" },
                          ]}
                        />
                      </Col>
                      <Col span={3}>
                        <FieldLabel>T2 sinyal</FieldLabel>
                        <Select<MRSignal>
                          value={state.liver.mr.t2_signal}
                          onChange={(v) => update("liver", { ...state.liver, mr: { ...state.liver.mr, t2_signal: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "HYPO", label: "Hipo" },
                            { value: "ISO", label: "İzo" },
                            { value: "HYPER", label: "Hiper" },
                            { value: "MIXED", label: "Miks" },
                          ]}
                        />
                      </Col>
                      <Col span={2}>
                        <FieldLabel>DWI restriksiyon</FieldLabel>
                        <Select<YesNoUnk>
                          value={state.liver.mr.dwi_restriction}
                          onChange={(v) => update("liver", { ...state.liver, mr: { ...state.liver.mr, dwi_restriction: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NO", label: "Yok" },
                            { value: "YES", label: "Var" },
                          ]}
                        />
                      </Col>
                      <Col span={2}>
                        <FieldLabel>Arteriyel hiperenh.</FieldLabel>
                        <Select<YesNoUnk>
                          value={state.liver.mr.arterial_hyperenhancement}
                          onChange={(v) =>
                            update("liver", { ...state.liver, mr: { ...state.liver.mr, arterial_hyperenhancement: v } })
                          }
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NO", label: "Yok" },
                            { value: "YES", label: "Var" },
                          ]}
                        />
                      </Col>
                      <Col span={2}>
                        <FieldLabel>Washout</FieldLabel>
                        <Select<YesNoUnk>
                          value={state.liver.mr.washout}
                          onChange={(v) => update("liver", { ...state.liver, mr: { ...state.liver.mr, washout: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NO", label: "Yok" },
                            { value: "YES", label: "Var" },
                          ]}
                        />
                      </Col>
                    </Row>
                    <div style={{ height: 12 }} />
                    <Row>
                      <Col span={3}>
                        <FieldLabel>In/Out phase</FieldLabel>
                        <Select<InOut>
                          value={state.liver.mr.in_phase_vs_opposed}
                          onChange={(v) =>
                            update("liver", { ...state.liver, mr: { ...state.liver.mr, in_phase_vs_opposed: v } })
                          }
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "SIGNAL_DROP", label: "Sinyal düşüşü var" },
                            { value: "NO_DROP", label: "Düşüş yok" },
                          ]}
                        />
                      </Col>
                      <Col span={3}>
                        <FieldLabel>Kapsül</FieldLabel>
                        <Select<YesNoUnk>
                          value={state.liver.mr.capsule}
                          onChange={(v) => update("liver", { ...state.liver, mr: { ...state.liver.mr, capsule: v } })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NO", label: "Yok" },
                            { value: "YES", label: "Var" },
                          ]}
                        />
                      </Col>
                      <Col span={3}>
                        <FieldLabel>HBP hipointens</FieldLabel>
                        <Select<YesNoUnk>
                          value={state.liver.mr.hbp_hypointense}
                          onChange={(v) =>
                            update("liver", { ...state.liver, mr: { ...state.liver.mr, hbp_hypointense: v } })
                          }
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NO", label: "Yok/izo/hiper" },
                            { value: "YES", label: "Hipointens" },
                          ]}
                        />
                      </Col>
                      <Col span={3}>
                        <FieldLabel>Komşu biliyer dilat.</FieldLabel>
                        <Select<YesNoUnk>
                          value={state.liver.biliary_dilatation_adjacent}
                          onChange={(v) => update("liver", { ...state.liver, biliary_dilatation_adjacent: v })}
                          options={[
                            { value: "UNK", label: "Bilinmiyor" },
                            { value: "NO", label: "Yok" },
                            { value: "YES", label: "Var" },
                          ]}
                        />
                      </Col>
                    </Row>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card title="3) Safra Kesesi">
            <Row>
              <Col span={4}>
                <FieldLabel>Safra kesesinde patoloji</FieldLabel>
                <Toggle checked={state.gallbladder.has_pathology} onChange={(v) => update("gallbladder", { ...state.gallbladder, has_pathology: v })} label="Patoloji var/yok" />
              </Col>

              {state.gallbladder.has_pathology && (
                <>
                  <Col span={4}>
                    <FieldLabel>Taş</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.gallbladder.stones}
                      onChange={(v) => update("gallbladder", { ...state.gallbladder, stones: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>
                  <Col span={4}>
                    <FieldLabel>Sludge</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.gallbladder.sludge}
                      onChange={(v) => update("gallbladder", { ...state.gallbladder, sludge: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Duvar kalınlığı (mm)</FieldLabel>
                    <NumberInput value={state.gallbladder.wall_thickening_mm} onChange={(v) => update("gallbladder", { ...state.gallbladder, wall_thickening_mm: clampNum(v, 0, 30) })} min={0} max={30} />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Perikolesistik sıvı</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.gallbladder.pericholecystic_fluid}
                      onChange={(v) => update("gallbladder", { ...state.gallbladder, pericholecystic_fluid: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Distansiyon</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.gallbladder.distension}
                      onChange={(v) => update("gallbladder", { ...state.gallbladder, distension: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Polip (mm)</FieldLabel>
                    <NumberInput value={state.gallbladder.polyp_mm} onChange={(v) => update("gallbladder", { ...state.gallbladder, polyp_mm: clampNum(v, 0, 50) })} min={0} max={50} />
                  </Col>
                </>
              )}
            </Row>
          </Card>

          <Card title="4) Safra Yolları">
            <Row>
              <Col span={4}>
                <FieldLabel>Safra yollarında patoloji</FieldLabel>
                <Toggle checked={state.bileduct.has_pathology} onChange={(v) => update("bileduct", { ...state.bileduct, has_pathology: v })} label="Patoloji var/yok" />
              </Col>

              {state.bileduct.has_pathology && (
                <>
                  <Col span={4}>
                    <FieldLabel>CBD çapı (mm)</FieldLabel>
                    <NumberInput value={state.bileduct.cbd_mm} onChange={(v) => update("bileduct", { ...state.bileduct, cbd_mm: clampNum(v, 0, 30) })} min={0} max={30} />
                  </Col>
                  <Col span={4}>
                    <FieldLabel>Stent</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.bileduct.stent_present}
                      onChange={(v) => update("bileduct", { ...state.bileduct, stent_present: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>

                  <Col span={3}>
                    <FieldLabel>İntrahepatik dilatasyon</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.bileduct.ihd_dilatation}
                      onChange={(v) => update("bileduct", { ...state.bileduct, ihd_dilatation: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Ekstrahepatik dilatasyon</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.bileduct.ehd_dilatation}
                      onChange={(v) => update("bileduct", { ...state.bileduct, ehd_dilatation: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Taş şüphesi</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.bileduct.stone_suspected}
                      onChange={(v) => update("bileduct", { ...state.bileduct, stone_suspected: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>
                  <Col span={3}>
                    <FieldLabel>Abrupt cutoff</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.bileduct.abrupt_cutoff}
                      onChange={(v) => update("bileduct", { ...state.bileduct, abrupt_cutoff: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>

                  <Col span={4}>
                    <FieldLabel>Pnömobili</FieldLabel>
                    <Select<YesNoUnk>
                      value={state.bileduct.pneumobilia}
                      onChange={(v) => update("bileduct", { ...state.bileduct, pneumobilia: v })}
                      options={[
                        { value: "UNK", label: "Bilinmiyor" },
                        { value: "NO", label: "Yok" },
                        { value: "YES", label: "Var" },
                      ]}
                    />
                  </Col>
                </>
              )}
            </Row>
          </Card>

          <div style={{ opacity: 0.75, fontSize: 12, padding: "0 6px 24px 6px" }}>
            ✅ Strict gating aktif: Modality değişince diğer modalitenin alanları temizlenir, UI gizlenir ve motor sadece seçilen modaliteyi kullanır.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ---------- ÇALIŞTIRMA ----------
 * npx create-next-app@latest abdomen-ai --ts --eslint --app
 * cd abdomen-ai
 * app/page.tsx -> bu dosyayı yapıştır
 * npm run dev
 * http://localhost:3000
 */

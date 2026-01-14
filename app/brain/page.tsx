"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type Confidence = "Düşük" | "Orta" | "Yüksek";
type Urgency = "Acil" | "Öncelikli" | "Rutin";

type Suggestion = {
  title: string;
  reasoning: string;
  reportLine: string;
  confidence: Confidence;
  urgency: Urgency;
  nextStep?: string;
};

function BadgeTone({ c }: { c: Confidence }) {
  return (
    <Badge variant={c === "Yüksek" ? "default" : c === "Orta" ? "secondary" : "outline"}>
      {c}
    </Badge>
  );
}

function UrgencyBadge({ u }: { u: Urgency }) {
  return <Badge variant={u === "Acil" ? "destructive" : u === "Öncelikli" ? "default" : "secondary"}>{u}</Badge>;
}

export default function BrainModulePage() {
  // 1) Serbest metin
  const [freeText, setFreeText] = useState("");

  // 2) Akut stroke
  const [hasDwiBright, setHasDwiBright] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [hasAdcLow, setHasAdcLow] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [hasFlairChange, setHasFlairChange] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [hasSuscept, setHasSuscept] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // GRE/SWI kan
  const [territory, setTerritory] = useState<"MCA" | "ACA" | "PCA" | "Vertebrobaziler" | "Belirsiz">("Belirsiz");

  // 3) Kanama triage (kısa)
  const [ctHyperdense, setCtHyperdense] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [sahSulcal, setSahSulcal] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [ivh, setIvh] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [massEffect, setMassEffect] = useState<"Yok" | "Hafif" | "Belirgin">("Yok");

  // 3.5) Kronik iskemi / lakün / PVS
  const [lacunarLike, setLacunarLike] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [smallVesselFlair, setSmallVesselFlair] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [cysticWithCsfSignal, setCysticWithCsfSignal] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [sizeMm, setSizeMm] = useState<"≤3mm" | "4–15mm" | ">15mm" | "Belirsiz">("Belirsiz");
  const [massEffectChronic, setMassEffectChronic] = useState<"Yok" | "Hafif" | "Belirgin" | "Belirsiz">("Belirsiz");
  const [flairRim, setFlairRim] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");

  const [lacuneRegion, setLacuneRegion] = useState<
    | "Centrum semiovale"
    | "Bazal ganglion"
    | "İç kapsül"
    | "Talamus"
    | "Pons"
    | "Hipokampus/Mezial temporal"
    | "Derin beyaz cevher"
    | "Belirsiz"
  >("Belirsiz");

  // 4) Kitle/enfeksiyon triage
  const [ringEnhance, setRingEnhance] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [restrictedCenter, setRestrictedCenter] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // abse merkezinde restriksiyon?
  const [edema, setEdema] = useState<"Yok" | "Var">("Yok");

  // 5) Kanama detay
  const [bleedType, setBleedType] = useState<
    "İPH" | "SAH" | "SDH" | "EDH" | "Kontüzyon" | "Hem. transformasyon" | "Belirsiz"
  >("Belirsiz");

  const [location, setLocation] = useState<
    "Lobar" | "Derin (BG/Thalamus)" | "Beyin sapı" | "Serebellum" | "Intraventriküler" | "Belirsiz"
  >("Belirsiz");

  const [size, setSize] = useState<"Küçük" | "Orta" | "Büyük" | "Belirsiz">("Belirsiz");
  const [midlineShift, setMidlineShift] = useState<"Yok" | "<5 mm" | "≥5 mm" | "Belirsiz">("Belirsiz");
  const [hydrocephalus, setHydrocephalus] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");

  const [anticoagulant, setAnticoagulant] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [traumaHx, setTraumaHx] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");
  const [htnHx, setHtnHx] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");

  // =========================
  // 6) KİSTİK ALAN AYIRICI (Yeni)
  // =========================
  const [cysticEntityPresent, setCysticEntityPresent] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor");

  const [compartment, setCompartment] = useState<"İntraaksiyel" | "Ekstraaksiyel" | "Ventriküler" | "Dural sinüs" | "Belirsiz">(
    "Belirsiz"
  );

  const [looksLikeCSF, setLooksLikeCSF] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // T1 düşük / T2 yüksek
  const [flairSuppressed, setFlairSuppressed] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // FLAIR baskılı mı?
  const [dwiRestrictCystic, setDwiRestrictCystic] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // epidermoid/abse vb
  const [enhanceCystic, setEnhanceCystic] = useState<"Yok" | "Rim" | "Nodüler" | "Bilinmiyor">("Bilinmiyor");
  const [gliosisRim, setGliosisRim] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // ensefalomalazi/lakün çevresinde gliosis
  const [localMassEffect, setLocalMassEffect] = useState<"Yok" | "Var" | "Bilinmiyor">("Bilinmiyor");

  const [cysticLocation, setCysticLocation] = useState<
    | "Posterior fossa – cisterna magna"
    | "Posterior fossa – 4. ventrikül komşuluğu"
    | "CPA (serebellopontin açı)"
    | "Suprasellar"
    | "Konveksite / fissür"
    | "Mezial temporal (koroid fissür/hipokampus)"
    | "Derin/intraaksiyel kavite (eski enfarkt?)"
    | "Dural sinüs komşuluğu (granülasyon?)"
    | "Belirsiz"
  >("Belirsiz");

  const [communicatesWith4V, setCommunicatesWith4V] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // PF ayırıcı
  const [vermisHypoplasia, setVermisHypoplasia] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // PF ayırıcı
  const [fourthVEnlarged, setFourthVEnlarged] = useState<"Evet" | "Hayır" | "Bilinmiyor">("Bilinmiyor"); // PF ayırıcı

  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = [];

    const acuteRestriction = hasDwiBright === "Evet" && hasAdcLow === "Evet";
    const noAcuteRestriction = !acuteRestriction;

    // --- AKUT İSKEMİ (DWI/ADC/FLAIR)
    if (acuteRestriction) {
      const hyperacute = hasFlairChange === "Hayır";
      out.push({
        title: hyperacute ? "Hiperakut/akut iskemik enfarkt olası" : "Akut–erken subakut iskemik enfarkt olası",
        reasoning: `DWI hiperintens + ADC düşük restriksiyon ile uyumlu. FLAIR ${
          hyperacute ? "belirgin değil → daha erken evre olası" : "eşlik ediyor → daha geç evre lehine"
        }. Vasküler dağılım: ${territory}.`,
        reportLine:
          "Difüzyon ağırlıklı görüntülerde (DWI) hiperintens ve ADC haritasında düşük sinyalli restriksiyon gösteren alan izlenmekte olup akut iskemik enfarkt ile uyumludur. FLAIR korelasyonu ile evreleme önerilir.",
        confidence: "Yüksek",
        urgency: "Acil",
        nextStep:
          "BT/BT anjiyo-perfüzyon veya klinik uygunlukla tromboliz/trombektomi algoritmasına göre acil değerlendirme; büyük damar oklüzyonu açısından vasküler görüntüleme."
      });
    }

    // --- “T2 shine-through / artefakt / geç evre” ihtimali
    if (hasDwiBright === "Evet" && hasAdcLow !== "Evet") {
      out.push({
        title: "DWI hiperintens: shine-through / T2 etkisi veya subakut-kronik olasılığı",
        reasoning:
          "DWI hiperintensiteye ADC düşüklüğü eşlik etmiyorsa gerçek restriksiyon dışı nedenler (T2 shine-through), artefakt veya daha geç evre olasılığı artar.",
        reportLine:
          "DWI’de izlenen hiperintensitenin ADC korelasyonu belirgin restriksiyon lehine değildir; T2 shine-through/artefakt ve klinik-radyolojik korelasyon önerilir.",
        confidence: "Orta",
        urgency: "Öncelikli",
        nextStep: "ADC ve FLAIR karşılaştırması + gerekli ise kontrast/anjiyografi ile korelasyon."
      });
    }

    // --- KANAMA (detaylı)
    const bleedSignal =
      ctHyperdense === "Evet" ||
      hasSuscept === "Evet" ||
      sahSulcal === "Evet" ||
      ivh === "Evet" ||
      bleedType !== "Belirsiz";

    if (bleedSignal) {
      const urgentByMass = massEffect === "Belirgin" || midlineShift === "≥5 mm" || hydrocephalus === "Evet";

      const likelyEtiology =
        traumaHx === "Evet"
          ? "Travmatik etiyoloji ön planda"
          : htnHx === "Evet" && (location === "Derin (BG/Thalamus)" || location === "Beyin sapı" || location === "Serebellum")
          ? "Hipertansif hemoraji lehine"
          : anticoagulant === "Evet"
          ? "Antikoagülan/koagülopati ilişkili kanama olasılığı artar"
          : "Etiyoloji için klinik ve görüntüleme korelasyonu gerekli";

      const typeText =
        bleedType === "Belirsiz"
          ? sahSulcal === "Evet"
            ? "Subaraknoid kanama (SAH) olası"
            : ivh === "Evet"
            ? "İntraventriküler kanama (IVH) olası"
            : "Kanama lehine bulgular"
          : bleedType;

      const urgency: Urgency = urgentByMass ? "Acil" : "Öncelikli";

      const positiveBits = [
        ctHyperdense === "Evet" ? "BT hiperdensite" : null,
        hasSuscept === "Evet" ? "GRE/SWI sinyal kaybı" : null,
        sahSulcal === "Evet" ? "SAH" : null,
        ivh === "Evet" ? "IVH" : null
      ].filter(Boolean);

      out.push({
        title: `Kanama: ${typeText}`,
        reasoning: [
          positiveBits.length ? `Kanama lehine: ${positiveBits.join(" / ")}.` : "",
          `Yerleşim: ${location}. Boyut: ${size}. Kitle etkisi: ${massEffect}. Orta hat: ${midlineShift}. Hidrosefali: ${hydrocephalus}.`,
          `${likelyEtiology}.`
        ]
          .filter(Boolean)
          .join(" "),
        reportLine:
          "İntrakraniyal kanama lehine bulgular izlenmektedir. Kanamanın tipi ve yerleşimi raporda belirtilmiş olup kitle etkisi/orta hat kayması ve ventriküler sistem açısından değerlendirme yapılmıştır. Klinik ve laboratuvar (koagülasyon/antikoagülan kullanımı) ile korelasyon önerilir.",
        confidence: "Yüksek",
        urgency,
        nextStep: (() => {
          if (bleedType === "SAH" || sahSulcal === "Evet") {
            return "Anevrizma/AVM açısından BT anjiyografi (ve klinik uygunlukla DSA) değerlendirmesi; nöroşirürji/nöroloji acil konsültasyonu.";
          }
          if (bleedType === "EDH" || bleedType === "SDH" || traumaHx === "Evet") {
            return "Travma protokolü kapsamında nöroşirürji değerlendirmesi; kitle etkisi/klinik kötüleşme varsa acil müdahale planı.";
          }
          if (urgentByMass) {
            return "Kitle etkisi/orta hat kayması/hidrosefali açısından acil klinik değerlendirme; gerekirse seri görüntüleme ve nöroşirürji konsültasyonu.";
          }
          if (anticoagulant === "Evet") {
            return "Antikoagülasyon/koagülopati açısından acil laboratuvar korelasyonu ve tersine çevirme protokolleri için klinik ekip ile koordinasyon.";
          }
          return "Etiyoloji (HT/CAA/AVM/tümör/venöz) açısından klinik ve gerekirse anjiyografik/perfüzyonel ek inceleme.";
        })()
      });

      // Hemorajik transformasyon ipucu (stroke + kanama)
      if (hasDwiBright === "Evet" && (hasSuscept === "Evet" || ctHyperdense === "Evet")) {
        out.push({
          title: "İskemik odakta hemorajik transformasyon olasılığı",
          reasoning:
            "DWI/ADC ile uyumlu iskemik alanla birlikte BT’de hiperdensite veya GRE/SWI’de kanama bulgusu hemorajik transformasyon ile uyumlu olabilir.",
          reportLine:
            "İskemik infarkt ile uyumlu alanda hemorajik komponent izlenmekte olup hemorajik transformasyon lehine değerlendirilmiştir; klinik tedavi (trombolitik/antitrombotik) planı açısından acil korelasyon önerilir.",
          confidence: "Orta",
          urgency: "Acil",
          nextStep: "Trombolitik/antitrombotik kararları için acil klinik değerlendirme; kanama yükü ve kitle etkisine göre takip/BT kontrol."
        });
      }
    }

    // --- Kitle/Enfeksiyon
    if (ringEnhance === "Evet" && restrictedCenter === "Evet") {
      out.push({
        title: "Ring kontrastlanan lezyon + merkezde restriksiyon: abse lehine",
        reasoning: `Klasik patern: ring enhancement + merkezde belirgin restriksiyon → pyojenik abse olasılığı artar. Ödem: ${edema}.`,
        reportLine:
          "Ring kontrastlanan lezyon izlenmekte olup lezyon merkezinde difüzyon restriksiyonu abse lehine yorumlanabilir. Klinik-laboratuvar korelasyonu ve tedavi planı için nöroloji/enfeksiyon değerlendirmesi önerilir.",
        confidence: "Yüksek",
        urgency: "Öncelikli",
        nextStep: "Klinik enfeksiyon bulguları + CRP/lökosit + tedavi yanıtı takibi; gerekirse cerrahi konsültasyon."
      });
    }

    if (ringEnhance === "Evet" && restrictedCenter !== "Evet") {
      out.push({
        title: "Ring kontrastlanan lezyon: neoplastik/nekrotik lezyon ayırıcı",
        reasoning:
          "Ring enhancement tek başına spesifik değildir. Merkez restriksiyon yoksa metastaz, GBM, radyonekroz vb. ayırıcı artar.",
        reportLine:
          "Ring kontrastlanan lezyon(lar) izlenmektedir. Difüzyon kısıtlılığı belirgin değilse neoplastik/nekrotik süreçler ayırıcı tanıda düşünülmelidir; MR perfüzyon/spektroskopi ve klinik korelasyon önerilir.",
        confidence: "Orta",
        urgency: "Öncelikli",
        nextStep: "MR perfüzyon + MR spektroskopi + sistemik tarama (metastaz şüphesi)."
      });
    }

    // --- KRONİK İSKEMİ / LAKÜN / PVS (akut restriksiyon yokken daha anlamlı)
    if (noAcuteRestriction) {
      // Küçük damar hastalığı
      if (smallVesselFlair === "Evet") {
        out.push({
          title: "Kronik küçük damar hastalığı (beyaz cevher değişiklikleri) olası",
          reasoning:
            "FLAIR’de periventriküler/derin beyaz cevher hiperintensiteleri kronik küçük damar hastalığı ile uyumlu olabilir.",
          reportLine:
            "Periventriküler ve/veya derin beyaz cevherde kronik küçük damar hastalığı ile uyumlu nonspesifik FLAIR hiperintensiteleri izlenmektedir.",
          confidence: "Orta",
          urgency: "Rutin",
          nextStep: "Vasküler risk faktörleri ile korelasyon (HT/DM/dislipidemi); önceki tetkiklerle karşılaştırma."
        });
      }

      // Lakün/PVS şüphesi varsa kaviter algoritma
      if (lacunarLike === "Evet") {
        // PVS (≤3mm, CSF sinyali, kitle etkisi yok)
        if (cysticWithCsfSignal === "Evet" && sizeMm === "≤3mm" && massEffectChronic === "Yok" && lacuneRegion !== "Hipokampus/Mezial temporal") {
          out.push({
            title: "Perivasküler boşluk (PVS) lehine",
            reasoning: `Küçük (≤3mm) CSF sinyalli odak ve kitle etkisi yok. Yerleşim: ${lacuneRegion}.`,
            reportLine:
              "Derin yapılarda/derin beyaz cevherde BOS sinyal özelliklerinde küçük perivasküler boşluklar (Virchow–Robin space) ile uyumlu görünümler izlenmektedir.",
            confidence: "Orta",
            urgency: "Rutin",
            nextStep: "Tipik görünümde ek işlem gerekmez; klinik ve önceki tetkiklerle korelasyon önerilir."
          });
        }

        // Lakün (4–15mm, kitle etkisi yok; FLAIR rim destek)
        if (sizeMm === "4–15mm" && massEffectChronic === "Yok") {
          const rimBoost = flairRim === "Evet";
          out.push({
            title: rimBoost ? "Laküner enfarkt sekeli (gliotik rim ile destekli) olası" : "Laküner enfarkt sekeli olası",
            reasoning: `Küçük kaviter odak (4–15mm) ve kitle etkisi yok. Yerleşim: ${lacuneRegion}. ${
              rimBoost ? "Çevresinde FLAIR rim/gliosis lakün lehine destekleyicidir." : "FLAIR rim yok/bilinmiyor."
            }`,
            reportLine: rimBoost
              ? "Derin yerleşimli küçük kaviter lezyon çevresinde gliotik FLAIR rim ile birlikte olup laküner enfarkt sekeli ile uyumludur."
              : "Derin yerleşimli küçük kaviter lezyon laküner enfarkt sekeli ile uyumlu olabilir.",
            confidence: rimBoost ? "Yüksek" : "Orta",
            urgency: "Rutin",
            nextStep: "Vasküler risk faktörleri açısından klinik değerlendirme; önceki incelemelerle karşılaştırma önerilir."
          });
        }

        // Hipokampus/MTL uyarısı
        if (lacuneRegion === "Hipokampus/Mezial temporal" && cysticWithCsfSignal === "Evet") {
          out.push({
            title: "Mezial temporal/hipokampus kistik odak: özel ayırıcı gerekir",
            reasoning:
              "Bu bölgede küçük CSF sinyalli odaklar PVS ile karışabilir; koroid fissür kisti, hipokampal sulkus remnant vb. düşünülebilir.",
            reportLine:
              "Mezial temporal bölgede BOS sinyalli küçük kistik odak izlenmekte olup lokalizasyon nedeniyle perivasküler boşluk dışı benign kistik oluşumlar ile ayırıcı tanı önerilir.",
            confidence: "Orta",
            urgency: "Rutin",
            nextStep: "Kesit/plan korelasyonu + önceki görüntüler; gerekirse ince kesit takip."
          });
        }

        // Atipik: >15mm veya kitle etkisi
        if (sizeMm === ">15mm" || massEffectChronic === "Hafif" || massEffectChronic === "Belirgin") {
          out.push({
            title: "Atipik kaviter lezyon: lakün/PVS dışı ayırıcı",
            reasoning: `Boyut/kitle etkisi lakün-PVS için atipik. Boyut: ${sizeMm}, kitle etkisi: ${massEffectChronic}.`,
            reportLine:
              "Kaviter lezyon boyutu/kitle etkisi nedeniyle lakün/PVS için atipik olup ayırıcı tanı (eski hematom kavitesi, kistik tümör/nekroz, ensefalomalazi vb.) açısından değerlendirme önerilir.",
            confidence: "Orta",
            urgency: "Öncelikli",
            nextStep: "Önceki görüntülerle karşılaştırma; gerekirse kontrastlı MR/perfüzyon-spektroskopi ile ileri değerlendirme."
          });
        }
      }
    }

    // =========================
    // KİSTİK ALAN AYIRICI (Yeni öneriler)
    // =========================
    if (cysticEntityPresent === "Evet") {
      const isCSFPattern = looksLikeCSF === "Evet" && flairSuppressed === "Evet";

      // 1) Ekstraaksiyel + CSF patern + restriksiyon yok + enh yok => Araknoid kist
      if (
        compartment === "Ekstraaksiyel" &&
        isCSFPattern &&
        dwiRestrictCystic !== "Evet" &&
        (enhanceCystic === "Yok" || enhanceCystic === "Bilinmiyor") &&
        localMassEffect !== "Var"
      ) {
        out.push({
          title: "Araknoid kist lehine (ekstraaksiyel, BOS sinyalli)",
          reasoning:
            `Ekstraaksiyel yerleşim + BOS sinyal paterni (T1 düşük/T2 yüksek + FLAIR baskılı). DWI restriksiyon yok/bilinmiyor ve anlamlı kontrastlanma yok. Yer: ${cysticLocation}.`,
          reportLine:
            "Ekstraaksiyel yerleşimli, BOS sinyal özelliklerinde kistik oluşum araknoid kist ile uyumlu olabilir. Kitle etkisi/komşuluk yapılar açısından korelasyon ve önceki tetkiklerle karşılaştırma önerilir.",
          confidence: "Orta",
          urgency: "Rutin",
          nextStep: "Semptom varsa nöroşirürji değerlendirmesi; büyüme/kompresyon şüphesinde takip."
        });
      }

      // 2) Ekstraaksiyel + BOS gibi ama FLAIR baskılanmıyor veya DWI restriksiyon var => Epidermoid
      if (
        compartment === "Ekstraaksiyel" &&
        looksLikeCSF === "Evet" &&
        (flairSuppressed === "Hayır" || dwiRestrictCystic === "Evet")
      ) {
        out.push({
          title: "Epidermoid lehine (BOS benzeri fakat FLAIR baskılanmayan / DWI restriksiyonlu)",
          reasoning:
            `BOS benzeri sinyal olabilir; ancak FLAIR’de tam baskılanmama ve/veya DWI restriksiyon epidermoid lehine güçlü ipucudur. Yer: ${cysticLocation}.`,
          reportLine:
            "Ekstraaksiyel kistik/heterojen lezyon BOS benzeri sinyal göstermekle birlikte FLAIR baskılanmaması ve/veya difüzyon restriksiyonu epidermoid ile uyumlu olabilir. Klinik ve sekans korelasyonu önerilir.",
          confidence: "Orta",
          urgency: "Öncelikli",
          nextStep: "DWI/ADC doğrulama + ince kesit; semptomatikse nöroşirürji konsültasyonu."
        });
      }

      // 3) İntraaksiyel kavite + gliosis + kitle etkisi yok => Ensefalomalazi (eski enfarkt/trauma)
      if (
        compartment === "İntraaksiyel" &&
        looksLikeCSF === "Evet" &&
        gliosisRim === "Evet" &&
        localMassEffect !== "Var" &&
        (enhanceCystic === "Yok" || enhanceCystic === "Bilinmiyor")
      ) {
        out.push({
          title: "Ensefalomalazi / kronik sekeller lehine (intraaksiyel kavite + gliosis)",
          reasoning:
            `İntraaksiyel BOS sinyalli kaviter alan ve çevresinde gliotik değişiklik (FLAIR rim). Kitle etkisi yok. Yer: ${cysticLocation}.`,
          reportLine:
            "İntraaksiyel yerleşimli BOS sinyal özelliklerinde kaviter alan ve çevresinde gliotik değişiklikler izlenmekte olup ensefalomalazi/kronik sekeller ile uyumlu olabilir. Klinik ve önceki tetkiklerle korelasyon önerilir.",
          confidence: "Orta",
          urgency: "Rutin",
          nextStep: "Eski enfarkt/trauma öyküsü ile korelasyon; gerekirse önceki tetkik karşılaştırması."
        });
      }

      // 4) Posterior fossa: mega cisterna magna vs Dandy-Walker spektrumu
      if (cysticLocation === "Posterior fossa – cisterna magna" || cysticLocation === "Posterior fossa – 4. ventrikül komşuluğu") {
        // Mega cisterna magna: vermis normal, 4V ile ileti yok, 4V geniş değil
        if (
          communicatesWith4V === "Hayır" &&
          vermisHypoplasia !== "Evet" &&
          fourthVEnlarged !== "Evet" &&
          isCSFPattern
        ) {
          out.push({
            title: "Mega cisterna magna lehine",
            reasoning:
              "Posterior fossada cisterna magna geniş; 4. ventrikülle belirgin ileti yok, vermis hipoplazisi yok/bilinmiyor ve 4. ventrikül belirgin geniş değil → mega cisterna magna lehine.",
            reportLine:
              "Posterior fossada cisterna magna geniş görünümde olup 4. ventrikül ile belirgin ileti ve vermian hipoplazi lehine bulgu izlenmemektedir; mega cisterna magna ile uyumlu olabilir.",
            confidence: "Orta",
            urgency: "Rutin",
            nextStep: "Klinik korelasyon; eşlik eden anomali şüphesinde ayrıntılı posterior fossa değerlendirmesi."
          });
        }

        // Dandy-Walker spektrumu: vermis hipoplazi + 4V geniş + ileti olabilir
        if (
          (vermisHypoplasia === "Evet" || fourthVEnlarged === "Evet") &&
          (communicatesWith4V === "Evet" || communicatesWith4V === "Bilinmiyor") &&
          isCSFPattern
        ) {
          out.push({
            title: "Dandy–Walker spektrumu / varyantı olası",
            reasoning:
              "Posterior fossada kistik genişleme ile birlikte vermian hipoplazi ve/veya 4. ventrikül genişliği ve 4V ile ileti bulguları Dandy–Walker spektrumu lehine olabilir.",
            reportLine:
              "Posterior fossada kistik genişleme ile birlikte vermian gelişim anomalisi ve/veya 4. ventrikül genişliği/ileti bulguları Dandy–Walker spektrumu ile uyumlu olabilir. Klinik ve detaylı posterior fossa korelasyonu önerilir.",
            confidence: "Orta",
            urgency: "Öncelikli",
            nextStep: "Posterior fossa anatomisinin ince kesitlerle değerlendirilmesi; pediatrik/nöroloji danışmanlığı (uygunsa)."
          });
        }
      }

      // 5) Dural sinüs komşuluğu + BOS benzeri => Araknoid granülasyon (tipik, küçük)
      if (compartment === "Dural sinüs" || cysticLocation === "Dural sinüs komşuluğu (granülasyon?)") {
        if (looksLikeCSF === "Evet" && localMassEffect !== "Var" && (enhanceCystic === "Yok" || enhanceCystic === "Bilinmiyor")) {
          out.push({
            title: "Araknoid granülasyon lehine",
            reasoning:
              "Dural venöz sinüs komşuluğunda BOS benzeri sinyal/dolum defekti görünümü araknoid granülasyon ile uyumlu olabilir (tipik yerleşim, kitle etkisi yok).",
            reportLine:
              "Dural venöz sinüs komşuluğunda BOS benzeri sinyal/dolum defekti görünümü araknoid granülasyon ile uyumlu olabilir. Klinik ve önceki tetkiklerle korelasyon önerilir.",
            confidence: "Orta",
            urgency: "Rutin",
            nextStep: "Atipik/şüpheli olguda MRV/kontrastlı değerlendirme ile korelasyon."
          });
        }
      }

      // 6) Rim/nodüler kontrastlanma + kitle etkisi => “basit kist” dışı uyarı
      if ((enhanceCystic === "Rim" || enhanceCystic === "Nodüler") || localMassEffect === "Var") {
        out.push({
          title: "Kistik lezyonda kontrastlanma/kitle etkisi: basit BOS boşluğu dışı ayırıcı",
          reasoning:
            `Kontrastlanma paterni: ${enhanceCystic}. Kitle etkisi: ${localMassEffect}. Bu bulgular basit PVS/araknoid kist gibi benign BOS boşluğu dışında ayırıcıyı genişletir.`,
          reportLine:
            "Kistik lezyonda kontrastlanma ve/veya kitle etkisi izlenmesi nedeniyle basit perivasküler boşluk/araknoid kist dışında ayırıcı tanılar (kistik tümör/nekroz, enfeksiyöz süreç, posthemorajik kavite vb.) açısından ileri değerlendirme önerilir.",
          confidence: "Orta",
          urgency: "Öncelikli",
          nextStep: "Kontrastlı MR + DWI/ADC + gerekirse perfüzyon/spektroskopi; klinik korelasyon."
        });
      }
    }

    // Eğer hiçbir şey seçilmediyse: boş kalmasın
    if (out.length === 0) {
      out.push({
        title: "Bulguları seçince öneriler oluşacak",
        reasoning: "Sekmelerden bulgu seçeneklerini işaretle. İstersen serbest metin de ekle.",
        reportLine: "Mevcut incelemede klinik bilgi ile korelasyon önerilir.",
        confidence: "Düşük",
        urgency: "Rutin"
      });
    }

    return out;
  }, [
    hasDwiBright,
    hasAdcLow,
    hasFlairChange,
    hasSuscept,
    territory,

    ctHyperdense,
    sahSulcal,
    ivh,
    massEffect,

    ringEnhance,
    restrictedCenter,
    edema,

    // kronik
    lacunarLike,
    smallVesselFlair,
    cysticWithCsfSignal,
    sizeMm,
    massEffectChronic,
    flairRim,
    lacuneRegion,

    // kanama detay
    bleedType,
    location,
    size,
    midlineShift,
    hydrocephalus,
    anticoagulant,
    traumaHx,
    htnHx,

    // kistik ayırıcı
    cysticEntityPresent,
    compartment,
    looksLikeCSF,
    flairSuppressed,
    dwiRestrictCystic,
    enhanceCystic,
    gliosisRim,
    localMassEffect,
    cysticLocation,
    communicatesWith4V,
    vermisHypoplasia,
    fourthVEnlarged
  ]);

  const compiledReport = useMemo(() => {
    const lines = suggestions.map((s) => `• ${s.reportLine}`);
    if (freeText.trim()) lines.unshift(`Klinik not / serbest metin: ${freeText.trim()}`);
    return lines.join("\n");
  }, [suggestions, freeText]);

  const copyReport = async () => {
    await navigator.clipboard.writeText(compiledReport);
  };

  const Choice = ({
    label,
    value,
    setValue,
    options
  }: {
    label: string;
    value: string;
    setValue: (v: any) => void;
    options: string[];
  }) => (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button key={o} variant={value === o ? "default" : "outline"} size="sm" onClick={() => setValue(o)}>
            {o}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Beyin Modülü (MVP)</h1>
          <p className="text-sm text-muted-foreground">
            Tanı koymaz; bulguyu yapılandırır, olasılık + güven + mediko-legal rapor dili üretir.
          </p>
        </div>
        <Button onClick={copyReport}>Raporu Kopyala</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serbest metin (opsiyonel)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Örn: 68Y, ani sağ hemiparezi, AF, NIHSS 12..."
            className="min-h-[90px]"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="stroke">
        <TabsList className="w-full flex flex-wrap justify-start">
          <TabsTrigger value="stroke">Akut İskemi</TabsTrigger>
          <TabsTrigger value="bleed">Kanama</TabsTrigger>
          <TabsTrigger value="mass">Kitle/Enfeksiyon</TabsTrigger>
          <TabsTrigger value="cystic">Kistik Alan Ayırıcı</TabsTrigger>
          <TabsTrigger value="report">Çıktı</TabsTrigger>
        </TabsList>

        {/* ================= Stroke + Kronik/Lakün/PVS ================= */}
        <TabsContent value="stroke" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Akut İskemi – çekirdek algoritma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Choice label="DWI hiperintens?" value={hasDwiBright} setValue={setHasDwiBright} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice label="ADC düşük (restriksiyon)?" value={hasAdcLow} setValue={setHasAdcLow} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice label="FLAIR değişiklik?" value={hasFlairChange} setValue={setHasFlairChange} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice label="GRE/SWI’de kanama/mikrokanama?" value={hasSuscept} setValue={setHasSuscept} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice label="Vasküler dağılım?" value={territory} setValue={setTerritory} options={["MCA", "ACA", "PCA", "Vertebrobaziler", "Belirsiz"]} />

              <Separator />

              <div className="text-sm font-semibold">Kronik iskemi / Lakün / PVS</div>

              <Choice
                label="FLAIR’de yaygın küçük damar hastalığı (WMH) var mı?"
                value={smallVesselFlair}
                setValue={setSmallVesselFlair}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="Küçük, kaviter/kistik odak (lakün/PVS şüphesi) var mı?"
                value={lacunarLike}
                setValue={setLacunarLike}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="Kistik odak BOS sinyalinde mi? (T1 düşük, T2 yüksek, FLAIR baskılı gibi)"
                value={cysticWithCsfSignal}
                setValue={setCysticWithCsfSignal}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="Boyut"
                value={sizeMm}
                setValue={setSizeMm}
                options={["≤3mm", "4–15mm", ">15mm", "Belirsiz"]}
              />

              <Choice
                label="Kitle etkisi"
                value={massEffectChronic}
                setValue={setMassEffectChronic}
                options={["Yok", "Hafif", "Belirgin", "Belirsiz"]}
              />

              <Choice
                label="FLAIR rim (lakün etrafında gliosis) var mı?"
                value={flairRim}
                setValue={setFlairRim}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="Yerleşim (detay)"
                value={lacuneRegion}
                setValue={setLacuneRegion}
                options={[
                  "Centrum semiovale",
                  "Bazal ganglion",
                  "İç kapsül",
                  "Talamus",
                  "Pons",
                  "Hipokampus/Mezial temporal",
                  "Derin beyaz cevher",
                  "Belirsiz"
                ]}
              />

              <div className="text-xs text-muted-foreground">
                İpucu: ≤3mm + BOS sinyali + kitle etkisi yok → PVS; 4–15mm + kitle etkisi yok + FLAIR rim → lakün sekeli lehine.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= Kanama ================= */}
        <TabsContent value="bleed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kanama – BT/MR triage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Separator />

              <Choice
                label="Kanama tipi?"
                value={bleedType}
                setValue={setBleedType}
                options={["İPH", "SAH", "SDH", "EDH", "Kontüzyon", "Hem. transformasyon", "Belirsiz"]}
              />

              <Choice
                label="Yerleşim?"
                value={location}
                setValue={setLocation}
                options={["Lobar", "Derin (BG/Thalamus)", "Beyin sapı", "Serebellum", "Intraventriküler", "Belirsiz"]}
              />

              <Choice label="Boyut?" value={size} setValue={setSize} options={["Küçük", "Orta", "Büyük", "Belirsiz"]} />

              <Choice
                label="Orta hat kayması?"
                value={midlineShift}
                setValue={setMidlineShift}
                options={["Yok", "<5 mm", "≥5 mm", "Belirsiz"]}
              />

              <Choice
                label="Hidrosefali?"
                value={hydrocephalus}
                setValue={setHydrocephalus}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Separator />

              <Choice label="Travma öyküsü?" value={traumaHx} setValue={setTraumaHx} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice label="HT öyküsü?" value={htnHx} setValue={setHtnHx} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice
                label="Antikoagülan / koagülopati?"
                value={anticoagulant}
                setValue={setAnticoagulant}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Separator />

              <Choice
                label="BT’de hiperdens kanama bulgusu?"
                value={ctHyperdense}
                setValue={setCtHyperdense}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />
              <Choice label="Sulkuslarda SAH?" value={sahSulcal} setValue={setSahSulcal} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice label="İntraventriküler kanama?" value={ivh} setValue={setIvh} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice label="Kitle etkisi / orta hat?" value={massEffect} setValue={setMassEffect} options={["Yok", "Hafif", "Belirgin"]} />

              <div className="text-xs text-muted-foreground">
                Not: GRE/SWI seçeneğini “Akut İskemi” sekmesinde de işaretleyebilirsin.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= Kitle/Enfeksiyon ================= */}
        <TabsContent value="mass" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kitle / Enfeksiyon – hızlı ayrım</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Choice label="Ring kontrastlanma?" value={ringEnhance} setValue={setRingEnhance} options={["Evet", "Hayır", "Bilinmiyor"]} />
              <Choice
                label="Merkezde restriksiyon (abse lehine)?"
                value={restrictedCenter}
                setValue={setRestrictedCenter}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />
              <Choice label="Vazojenik ödem?" value={edema} setValue={setEdema} options={["Yok", "Var"]} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= Kistik Alan Ayırıcı (Yeni) ================= */}
        <TabsContent value="cystic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kistik Alan Ayırıcı – hızlı karar ağacı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Choice
                label="Kistik / BOS benzeri alan var mı?"
                value={cysticEntityPresent}
                setValue={setCysticEntityPresent}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Separator />

              <Choice
                label="Kompartman"
                value={compartment}
                setValue={setCompartment}
                options={["İntraaksiyel", "Ekstraaksiyel", "Ventriküler", "Dural sinüs", "Belirsiz"]}
              />

              <Choice
                label="T1 düşük + T2 yüksek (BOS gibi) mi?"
                value={looksLikeCSF}
                setValue={setLooksLikeCSF}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="FLAIR baskılı (BOS gibi) mi?"
                value={flairSuppressed}
                setValue={setFlairSuppressed}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="DWI restriksiyon var mı? (epidermoid/abse vb)"
                value={dwiRestrictCystic}
                setValue={setDwiRestrictCystic}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="Kontrastlanma paterni"
                value={enhanceCystic}
                setValue={setEnhanceCystic}
                options={["Yok", "Rim", "Nodüler", "Bilinmiyor"]}
              />

              <Choice
                label="Çevrede gliosis (FLAIR rim) var mı? (ensefalomalazi/lakün destek)"
                value={gliosisRim}
                setValue={setGliosisRim}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="Lokal kitle etkisi var mı?"
                value={localMassEffect}
                setValue={setLocalMassEffect}
                options={["Yok", "Var", "Bilinmiyor"]}
              />

              <Separator />

              <Choice
                label="Yerleşim"
                value={cysticLocation}
                setValue={setCysticLocation}
                options={[
                  "Posterior fossa – cisterna magna",
                  "Posterior fossa – 4. ventrikül komşuluğu",
                  "CPA (serebellopontin açı)",
                  "Suprasellar",
                  "Konveksite / fissür",
                  "Mezial temporal (koroid fissür/hipokampus)",
                  "Derin/intraaksiyel kavite (eski enfarkt?)",
                  "Dural sinüs komşuluğu (granülasyon?)",
                  "Belirsiz"
                ]}
              />

              <Separator />
              <div className="text-sm font-semibold">Posterior fossa özel sorular</div>

              <Choice
                label="4. ventrikül ile ileti var mı?"
                value={communicatesWith4V}
                setValue={setCommunicatesWith4V}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="Vermis hipoplazisi var mı?"
                value={vermisHypoplasia}
                setValue={setVermisHypoplasia}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <Choice
                label="4. ventrikül geniş mi?"
                value={fourthVEnlarged}
                setValue={setFourthVEnlarged}
                options={["Evet", "Hayır", "Bilinmiyor"]}
              />

              <div className="text-xs text-muted-foreground">
                Pratik: Ekstraaksiyel + BOS sinyali + DWI restriksiyon → epidermoid düşün. Posterior fossa’da 4V ileti + vermis anomali → Dandy–Walker spektrumu.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= Çıktı ================= */}
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Öneriler + Rapor çıktısı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestions.map((s, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <UrgencyBadge u={s.urgency} />
                        <BadgeTone c={s.confidence} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">{s.reasoning}</div>
                    <Separator />
                    <div className="text-sm font-medium">Rapor cümlesi</div>
                    <div className="text-sm text-muted-foreground">{s.reportLine}</div>
                    {s.nextStep && (
                      <>
                        <Separator />
                        <div className="text-sm font-medium">Önerilen sonraki adım</div>
                        <div className="text-sm text-muted-foreground">{s.nextStep}</div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Separator />
              <div className="text-sm font-medium">Tek parça kopyalanabilir rapor</div>
              <Textarea readOnly value={compiledReport} className="min-h-[160px]" />
              <Button onClick={copyReport}>Raporu Kopyala</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

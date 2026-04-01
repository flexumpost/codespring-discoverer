import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import flexumLogo from "@/assets/flexum-logo-print.png";
import daoPorto from "@/assets/dao-porto.png";

type EnvelopeGroup = {
  addressKey: string;
  companies: { name: string; typeName: string }[];
  shippingRecipient: string | null;
  shippingCo: string | null;
  shippingAddress: string | null;
  shippingZip: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingCountry: string | null;
};

const COUNTRY_CODES: Record<string, string> = {
  "danmark": "DK", "denmark": "DK",
  "sverige": "SE", "sweden": "SE",
  "norge": "NO", "norway": "NO",
  "finland": "FI",
  "tyskland": "DE", "germany": "DE",
  "frankrig": "FR", "france": "FR",
  "spanien": "ES", "spain": "ES",
  "italien": "IT", "italy": "IT",
  "holland": "NL", "nederlandene": "NL", "netherlands": "NL",
  "belgien": "BE", "belgium": "BE",
  "østrig": "AT", "austria": "AT",
  "schweiz": "CH", "switzerland": "CH",
  "polen": "PL", "poland": "PL",
  "storbritannien": "GB", "united kingdom": "GB", "uk": "GB",
  "usa": "US", "united states": "US",
  "island": "IS", "iceland": "IS",
  "portugal": "PT",
  "irland": "IE", "ireland": "IE",
  "grækenland": "GR", "greece": "GR",
  "tjekkiet": "CZ", "czech republic": "CZ", "czechia": "CZ",
  "letland": "LV", "latvia": "LV",
  "litauen": "LT", "lithuania": "LT",
  "estland": "EE", "estonia": "EE",
  "ungarn": "HU", "hungary": "HU",
  "rumænien": "RO", "romania": "RO",
  "bulgarien": "BG", "bulgaria": "BG",
  "kroatien": "HR", "croatia": "HR",
  "slovenien": "SI", "slovenia": "SI",
  "slovakiet": "SK", "slovakia": "SK",
  "luxembourg": "LU",
  "malta": "MT",
  "cypern": "CY", "cyprus": "CY",
  // Balkan / Sydøsteuropa
  "serbien": "RS", "serbia": "RS",
  "montenegro": "ME",
  "bosnien": "BA", "bosnia": "BA", "bosnien-hercegovina": "BA",
  "nordmakedonien": "MK", "north macedonia": "MK", "macedonia": "MK",
  "albanien": "AL", "albania": "AL",
  "kosovo": "XK",
  // Østeuropa
  "ukraine": "UA",
  "hviderusland": "BY", "belarus": "BY",
  "moldova": "MD",
  // Sydeuropa / småstater
  "tyrkiet": "TR", "turkey": "TR", "türkiye": "TR",
  "monaco": "MC",
  "liechtenstein": "LI",
  "andorra": "AD",
  "san marino": "SM",
  // Nordamerika
  "canada": "CA",
  "mexico": "MX",
  // Andre almindelige
  "australien": "AU", "australia": "AU",
  "japan": "JP",
  "kina": "CN", "china": "CN",
  "indien": "IN", "india": "IN",
  "brasilien": "BR", "brazil": "BR",
  "sydafrika": "ZA", "south africa": "ZA",
  "sydkorea": "KR", "south korea": "KR",
  "israel": "IL",
  "new zealand": "NZ",
  "singapore": "SG",
  "hong kong": "HK",
  "forenede arabiske emirater": "AE", "united arab emirates": "AE",
  "saudi-arabien": "SA", "saudi arabia": "SA",
  "thailand": "TH",
  "taiwan": "TW",
};

function getCountryCode(country: string | null): string {
  if (!country) return "";
  return COUNTRY_CODES[country.toLowerCase().trim()] ?? "";
}

function formatCo(val: string): string {
  return val.match(/^c\/o\s/i) ? val : `c/o ${val}`;
}

function isDanmark(country: string | null): boolean {
  if (!country) return false;
  const lower = country.toLowerCase().trim();
  return lower === "danmark" || lower === "denmark";
}

interface EnvelopePrintProps {
  groups: EnvelopeGroup[];
  onAfterPrint: () => void;
}

export function EnvelopePrint({ groups, onAfterPrint }: EnvelopePrintProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
      onAfterPrint();
    }, 500);
    return () => clearTimeout(timer);
  }, [onAfterPrint]);

  return createPortal(
    <div id="envelope-print-container" style={{ position: "fixed", inset: 0, zIndex: 99999, background: "white" }}>
      <style>{`
        @media print {
          body > *:not(#envelope-print-container) {
            display: none !important;
          }
          #envelope-print-container {
            position: static !important;
            display: block !important;
          }
          @page {
            size: 229mm 324mm landscape;
            margin: 0;
          }
          .envelope-page {
            width: 324mm;
            height: 229mm;
            page-break-after: always;
            position: relative;
            box-sizing: border-box;
            padding: 8mm 15mm;
          }
          .envelope-page:last-child {
            page-break-after: avoid;
          }
        }
        @media screen {
          #envelope-print-container {
            display: none;
          }
        }
      `}</style>
      {groups.map((group, idx) => {
        const cc = getCountryCode(group.shippingCountry);
        const isPlus = group.companies.some((c) => c.typeName === "Plus");
        const showP = isDanmark(group.shippingCountry) && isPlus;

        return (
          <div key={idx} className="envelope-page" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <img src={flexumLogo} alt="Flexum" style={{ width: "69mm", marginBottom: "2mm" }} />
                <div style={{ fontSize: "10pt", lineHeight: "1.4" }}>
                  Maglebjergvej 6, 2800 Kongens Lyngby, Danmark
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "3mm", marginRight: "0" }}>
                {showP && <span style={{ fontSize: "24pt", fontWeight: "bold", lineHeight: "1" }}>P</span>}
                <img src={daoPorto} alt="DAO Porto" style={{ height: "25mm" }} />
              </div>
            </div>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "18pt", lineHeight: "1.6", textAlign: "left", minWidth: "120mm",
            }}>
              {group.shippingRecipient && <div>{group.shippingRecipient}</div>}
              {group.shippingCo && <div>{formatCo(group.shippingCo)}</div>}
              {group.shippingAddress && <div>{group.shippingAddress}</div>}
              {(group.shippingZip || group.shippingCity) && (
                <div>
                  {[cc, "-", group.shippingZip, group.shippingCity].filter(Boolean).join(" ").replace("  ", " ")}
                </div>
              )}
              {group.shippingState && <div>{group.shippingState}</div>}
              {group.shippingCountry && <div>{group.shippingCountry}</div>}
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

export type { EnvelopeGroup };

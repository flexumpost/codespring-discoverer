import { useRef } from "react";
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
  onAfterPrint?: () => void;
}

export function EnvelopePrint({ groups, onAfterPrint }: EnvelopePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
    onAfterPrint?.();
  };

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#envelope-print-container) {
            display: none !important;
          }
          #envelope-print-container {
            display: block !important;
          }
          @page {
            size: 324mm 229mm;
            margin: 0;
          }
          .envelope-page {
            width: 324mm;
            height: 229mm;
            page-break-after: always;
            position: relative;
            box-sizing: border-box;
            padding: 15mm 20mm;
          }
          .envelope-page:last-child {
            page-break-after: avoid;
          }
        }
      `}</style>
      <div
        id="envelope-print-container"
        ref={printRef}
        className="hidden print:block"
      >
        {groups.map((group, idx) => {
          const cc = getCountryCode(group.shippingCountry);
          const isPlus = group.companies.some(
            (c) => c.typeName === "Plus"
          );
          const showP = isDanmark(group.shippingCountry) && isPlus;

          return (
            <div key={idx} className="envelope-page" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              {/* Top section */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {/* Top left: Logo + return address */}
                <div>
                  <img
                    src={flexumLogo}
                    alt="Flexum"
                    style={{ height: "18mm", marginBottom: "3mm" }}
                  />
                  <div style={{ fontSize: "10pt", lineHeight: "1.4" }}>
                    <div>Maglebjergvej 6,</div>
                    <div>2800 Kongens Lyngby,</div>
                    <div>Danmark</div>
                  </div>
                </div>

                {/* Top right: P + DAO porto */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "3mm" }}>
                  {showP && (
                    <span style={{ fontSize: "24pt", fontWeight: "bold", lineHeight: "1" }}>P</span>
                  )}
                  <img
                    src={daoPorto}
                    alt="DAO Porto"
                    style={{ height: "25mm" }}
                  />
                </div>
              </div>

              {/* Center: Recipient address */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "14pt",
                  lineHeight: "1.6",
                  textAlign: "left",
                  minWidth: "120mm",
                }}
              >
                {group.shippingRecipient && <div>{group.shippingRecipient}</div>}
                {group.shippingCo && <div>{formatCo(group.shippingCo)}</div>}
                {group.shippingAddress && <div>{group.shippingAddress}</div>}
                {(group.shippingZip || group.shippingCity) && (
                  <div>
                    {[cc, "-", group.shippingZip, group.shippingCity]
                      .filter(Boolean)
                      .join(" ")
                      .replace("  ", " ")}
                  </div>
                )}
                {group.shippingState && <div>{group.shippingState}</div>}
                {group.shippingCountry && <div>{group.shippingCountry}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {/* Trigger button rendered by parent */}
    </>
  );
}

export type { EnvelopeGroup };

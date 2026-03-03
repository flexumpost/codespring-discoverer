import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MAIL_PRICING: Record<string, { forklaring: string; forsendelsesdag: string; ekstraForsendelse: string; ekstraScanning: string; ekstraAfhentning: string }> = {
  Lite: {
    forklaring: "Scanning fortages gratis den første torsdag i måneden. Afhentning kan ske gratis den første torsdag i måneden, skal bookes. Forsendelse er gratis, men tillægges porto.",
    forsendelsesdag: "Første torsdag i måneden",
    ekstraForsendelse: "50 kr. pr. forsendelse + porto",
    ekstraScanning: "50 kr. (Skal bookes)",
    ekstraAfhentning: "50 kr. (Skal bookes)",
  },
  Standard: {
    forklaring: "Scanning fortages gratis hver torsdag. Afhentning kan ske gratis den hver torsdag, skal bookes. Forsendelse sker hver torsdag og tillægges porto.",
    forsendelsesdag: "Hver torsdag",
    ekstraForsendelse: "Ingen ekstra forsendelse",
    ekstraScanning: "30 kr. (Skal bookes)",
    ekstraAfhentning: "30 kr. (Skal bookes)",
  },
  Plus: {
    forklaring: "Scanning fortages gratis alle hverdage. Afhentning kan ske gratis på alle hverdage, skal bookes. Forsendelse sker hver torsdag, gratis porto.",
    forsendelsesdag: "Hver torsdag",
    ekstraForsendelse: "Ingen ekstra forsendelse",
    ekstraScanning: "0 kr. (Skal bookes)",
    ekstraAfhentning: "0 kr. (Skal bookes)",
  },
};

const PACKAGE_PRICING: Record<string, { haandteringsgebyr: string; afhentning: string; forsendelse: string }> = {
  Lite: {
    haandteringsgebyr: "50 kr.",
    afhentning: "Afhentning kan ske hver torsdag efter aftale (Skal bookes)",
    forsendelse: "Porto tillægges",
  },
  Standard: {
    haandteringsgebyr: "30 kr.",
    afhentning: "Afhentning kan ske hver torsdag efter aftale (Skal bookes)",
    forsendelse: "Porto tillægges",
  },
  Plus: {
    haandteringsgebyr: "10 kr.",
    afhentning: "Afhentning kan ske efter aftale (Skal bookes)",
    forsendelse: "Porto tillægges",
  },
};

interface PricingOverviewProps {
  tenantTypeName: string | undefined;
}

export function PricingOverview({ tenantTypeName }: PricingOverviewProps) {
  if (!tenantTypeName || !["Lite", "Standard", "Plus"].includes(tenantTypeName)) {
    return null;
  }

  const mail = MAIL_PRICING[tenantTypeName];
  const pkg = PACKAGE_PRICING[tenantTypeName];

  return (
    <>
      {/* Breve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breve — priser og betingelser ({tenantTypeName})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            {mail.forklaring}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Emne</TableHead>
                <TableHead>Betingelse / Pris</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Forsendelsesdag</TableCell>
                <TableCell>{mail.forsendelsesdag}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Ekstra forsendelse</TableCell>
                <TableCell>{mail.ekstraForsendelse}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Ekstra scanning af post</TableCell>
                <TableCell>{mail.ekstraScanning}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Ekstra afhentning</TableCell>
                <TableCell>{mail.ekstraAfhentning}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pakker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pakker — priser og betingelser ({tenantTypeName})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Emne</TableHead>
                <TableHead>Betingelse / Pris</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Håndteringsgebyr</TableCell>
                <TableCell>{pkg.haandteringsgebyr}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Afhentning</TableCell>
                <TableCell>{pkg.afhentning}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Forsendelse</TableCell>
                <TableCell>{pkg.forsendelse}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

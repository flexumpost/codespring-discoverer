import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Tenant {
  id: string;
  company_name: string;
}

interface TenantSelectorProps {
  tenants: Tenant[];
  selectedTenantId: string | null;
  onSelect: (id: string) => void;
}

export function TenantSelector({ tenants, selectedTenantId, onSelect }: TenantSelectorProps) {
  if (tenants.length <= 1) return null;

  return (
    <Select value={selectedTenantId ?? undefined} onValueChange={onSelect}>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder="Vælg virksomhed" />
      </SelectTrigger>
      <SelectContent>
        {tenants.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.company_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

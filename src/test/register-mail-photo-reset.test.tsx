import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterMailDialog } from "@/components/RegisterMailDialog";

const { invoke, camera } = vi.hoisted(() => ({ invoke: vi.fn(), camera: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "operator" } }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[0] === "tenants-active"
    ? [{ id: "tenant-a", company_name: "Firma A", contact_first_name: "", contact_last_name: "" }]
    : [] }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/validateStampNumber", () => ({ validateStampNumber: () => ({ valid: true }) }));

function upload(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("Missing photo input");
  fireEvent.change(input, { target: { files: [new File(["photo"], "letter.jpg", { type: "image/jpeg" })] } });
}

beforeEach(() => {
  invoke.mockReset();
  camera.mockReset().mockResolvedValue({ getTracks: () => [] });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: camera } });
  URL.createObjectURL = vi.fn(() => "blob:photo");
});
afterEach(cleanup);

describe("New registration photo", () => {
  it("discards the previous letter's sender, number, recipient and registered flag", async () => {
    invoke.mockResolvedValueOnce({ data: { stamp_number: "3955", sender_name: "Old sender", recipient_name: "Firma A", is_registered: true } });
    const { container } = render(<RegisterMailDialog open onOpenChange={vi.fn()} />);
    upload(container);
    await screen.findByDisplayValue("Old sender");
    expect(screen.getByDisplayValue("3955")).toBeInTheDocument();
    expect(screen.getByText("Firma A")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "registerMail.takeNewPhoto" }));
    fireEvent.click(await screen.findByRole("button", { name: "registerMail.cancelCamera" }));
    invoke.mockResolvedValueOnce({ data: { stamp_number: "3956", sender_name: "New sender" } });
    upload(container);
    await screen.findByDisplayValue("New sender");
    expect(screen.getByDisplayValue("3956")).toBeInTheDocument();
    expect(screen.queryByText("Firma A")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.queryByDisplayValue("Old sender")).not.toBeInTheDocument();
  });

  it("ignores an earlier OCR response arriving after a replacement photo", async () => {
    let resolveOld: (value: unknown) => void = () => {};
    invoke.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const { container } = render(<RegisterMailDialog open onOpenChange={vi.fn()} />);
    upload(container);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "registerMail.takeNewPhoto" }));
    fireEvent.click(await screen.findByRole("button", { name: "registerMail.cancelCamera" }));
    invoke.mockResolvedValueOnce({ data: { stamp_number: "3956", sender_name: "New sender" } });
    upload(container);
    await screen.findByDisplayValue("New sender");
    resolveOld({ data: { stamp_number: "3955", sender_name: "Old sender", recipient_name: "Firma A", is_registered: true } });
    await waitFor(() => expect(screen.getByDisplayValue("3956")).toBeInTheDocument());
    expect(screen.queryByDisplayValue("Old sender")).not.toBeInTheDocument();
    expect(screen.queryByText("Firma A")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
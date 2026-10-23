import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { inspect, resolve, invalidate } = vi.hoisted(() => ({ inspect: vi.fn(), resolve: vi.fn(), invalidate: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }));
vi.mock("@/lib/order-review.functions", () => ({ inspectBlingOrderForReview: inspect, resolveOrderHold: resolve }));
import { OrderHoldReview } from "@/components/OrderHoldReview";
const order = { id: "order", financial_revision: "revision-1", payment_status: "approved", bling_sync_error: "manual hold" };
beforeEach(() => invalidate.mockResolvedValue(undefined));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function fillReason() {
  fireEvent.change(screen.getByLabelText("Motivo da decisão"), { target: { value: "Conferência humana concluída" } });
  fireEvent.change(screen.getByLabelText(/Referência da evidência/), { target: { value: "FIN-2026-001" } });
}
describe("Administrative hold review form", () => {
  it("requires evidence and a current verified association before accepting an export", async () => {
    inspect.mockResolvedValue({ outcome: "found", blingId: 42, revision: "revision-2", paymentStatus: "approved" });
    resolve.mockResolvedValue({ revision: "resolved" });
    const view = render(<OrderHoldReview order={order} />);
    const accept = screen.getByRole("button", { name: "Confirmar pedido já existente no Bling" });
    expect(accept).toBeDisabled(); fillReason(); expect(accept).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Conferir pagamento e vínculo existente" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(accept).toBeDisabled();
    view.rerender(<OrderHoldReview order={{ ...order, financial_revision: "revision-2" }} />);
    await waitFor(() => expect(accept).toBeEnabled()); fireEvent.click(accept);
    await waitFor(() => expect(resolve).toHaveBeenCalledWith({ data: { id: "order", revision: "revision-2", action: "accept_verified_export", reason: "Conferência humana concluída", evidence: "FIN-2026-001" } }));
  });
  it("does not offer approval for failed payments even if an ERP order exists", async () => {
    inspect.mockResolvedValue({ outcome: "found", blingId: 42, revision: "revision-1", paymentStatus: "failed" });
    resolve.mockResolvedValue({ revision: "recorded" });
    render(<OrderHoldReview order={{ ...order, payment_status: "failed" }} />); fillReason();
    fireEvent.click(screen.getByRole("button", { name: "Conferir pagamento e vínculo existente" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Confirmar pedido já existente no Bling" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Registrar e manter bloqueio" }));
    await waitFor(() => expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "keep_blocked" }) })));
  });
  it("requires a new inspection after the server rejects stale evidence", async () => {
    inspect.mockResolvedValue({ outcome: "found", blingId: 42, revision: "revision-1", paymentStatus: "approved" });
    resolve.mockRejectedValue(new Error("Evidência expirada. Confira novamente."));
    render(<OrderHoldReview order={order} />); fillReason();
    fireEvent.click(screen.getByRole("button", { name: "Conferir pagamento e vínculo existente" }));
    const accept = screen.getByRole("button", { name: "Confirmar pedido já existente no Bling" });
    await waitFor(() => expect(accept).toBeEnabled()); fireEvent.click(accept);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Evidência expirada"));
    expect(accept).toBeDisabled();
  });
});

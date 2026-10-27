import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/hooks/use-theme";

describe("Theme toggle", () => {
  beforeEach(() => {
    document.documentElement.className = "dark";
    document.documentElement.style.colorScheme = "dark";
    window.localStorage.clear();
  });

  it("switches the whole document to light theme and persists the preference", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ativar tema claro" }));

    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(window.localStorage.getItem("sw-sports-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Ativar tema escuro" })).toBeInTheDocument();
  });
});

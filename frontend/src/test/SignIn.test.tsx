import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "../auth/AuthProvider";
import { SignIn } from "../pages/SignIn";
import { ApiError, getCurrentAccount, signInAccount } from "../services/api";

vi.mock("../services/api", () => ({
  getCurrentAccount: vi.fn(),
  signInAccount: vi.fn(),
  signUpAccount: vi.fn(),
  signOutAccount: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

const mockedSignIn = vi.mocked(signInAccount);

describe("sign in", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedSignIn.mockReset();
    vi.mocked(getCurrentAccount).mockReset();
  });

  it("opens the desk after a valid account signs in", async () => {
    mockedSignIn.mockResolvedValue({
      token: "session-token",
      user: { id: "officer-1", name: "Ayesha Perera", email: "ayesha@bank.example" },
    });
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/sign-in"]}>
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/" element={<h1>Desk home</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText("Email"), "ayesha@bank.example");
    await user.type(screen.getByLabelText("Password"), "a-long-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Desk home" })).toBeInTheDocument();
    expect(mockedSignIn).toHaveBeenCalledWith({ email: "ayesha@bank.example", password: "a-long-password" });
  });

  it("shows the service message when the password is wrong", async () => {
    mockedSignIn.mockRejectedValue(new ApiError("The email or password is incorrect.", 401, "unauthorized"));
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <MemoryRouter>
          <SignIn />
        </MemoryRouter>
      </AuthProvider>,
    );
    await user.type(screen.getByLabelText("Email"), "ayesha@bank.example");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The email or password is incorrect.");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { CallListProvider } from "../campaign/callList";
import { ToastProvider } from "../components/ui/Toast";
import { Predict } from "../pages/Predict";
import { ApiError, predictSubscription } from "../services/api";
import type { PredictionResponse } from "../types/prediction";

vi.mock("../services/api", () => ({
  predictSubscription: vi.fn(),
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

const mockedPredict = vi.mocked(predictSubscription);

const SUCCESS: PredictionResponse = {
  probability: 0.771695,
  decision: "priority",
  decision_label: "Prioritize Outreach",
  threshold: 0.7,
  model_name: "Logistic Regression",
  target: "Term Deposit Subscription",
  message: "This customer has an estimated 77.2% probability of subscribing.",
  explanation: "The model estimates a relatively high likelihood of term-deposit subscription.",
  above_threshold: true,
  disclaimer: "Prediction is a probabilistic decision-support signal.",
};

function renderPredict() {
  localStorage.clear();
  return render(
    <ToastProvider>
      <CallListProvider>
        <MemoryRouter>
          <Predict />
        </MemoryRouter>
      </CallListProvider>
    </ToastProvider>,
  );
}

describe("prediction workspace", () => {
  beforeEach(() => {
    mockedPredict.mockReset();
  });

  it("renders the customer form and required labels", () => {
    renderPredict();
    expect(screen.getByLabelText("Age")).toBeInTheDocument();
    expect(screen.getByLabelText("Occupation")).toBeInTheDocument();
    expect(screen.getByLabelText("Days Since Previous Contact")).toBeInTheDocument();
    expect(screen.getByLabelText("Number of Employees")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate assessment" })).toBeEnabled();
    expect(screen.getByText("No assessment yet")).toBeInTheDocument();
    expect(screen.queryByLabelText(/duration/i)).not.toBeInTheDocument();
  });

  it("shows inline validation when required input is missing or out of range", async () => {
    const user = userEvent.setup();
    renderPredict();
    await user.click(screen.getByRole("button", { name: "Generate assessment" }));
    expect(await screen.findByText("Age is required.")).toBeInTheDocument();
    expect(mockedPredict).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Age"), "10");
    await user.tab();
    expect(await screen.findByText("Age must be between 17 and 98.")).toBeInTheDocument();
  });

  it("rejects a previous-campaign combination the dataset never contains", async () => {
    const user = userEvent.setup();
    renderPredict();
    await user.click(screen.getByRole("button", { name: "Load example customer" }));
    await user.selectOptions(screen.getByLabelText("Previous Campaign Outcome"), "success");
    await user.click(screen.getByRole("button", { name: "Generate assessment" }));
    expect(await screen.findByText("Select no previous campaign when previous contacts is 0.")).toBeInTheDocument();
    expect(screen.getByText("Enter at least 1 previous contact when the previous campaign succeeded or failed.")).toBeInTheDocument();
    expect(mockedPredict).not.toHaveBeenCalled();
  });

  it("loads an example, shows a loading state, and renders the real response shape", async () => {
    const user = userEvent.setup();
    let resolvePrediction: (value: PredictionResponse) => void = () => undefined;
    mockedPredict.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePrediction = resolve;
        }),
    );
    renderPredict();
    await user.click(screen.getByRole("button", { name: "Load example customer" }));
    expect(screen.getByLabelText("Age")).toHaveValue(29);
    await user.click(screen.getByRole("button", { name: "Generate assessment" }));
    expect(await screen.findByText("Analyzing customer profile...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate assessment" })).toBeDisabled();
    resolvePrediction(SUCCESS);
    expect(await screen.findByText("Prioritize Outreach")).toBeInTheDocument();
    expect(screen.getByText("77.2%")).toBeInTheDocument();
    expect(screen.getByText(/above the model's operational threshold of 70%/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact this customer before lower-priority profiles/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add to today's call list" }));
    expect(screen.getByRole("button", { name: "On today's call list" })).toBeDisabled();
    expect(mockedPredict).toHaveBeenCalledWith(
      expect.objectContaining({
        age: 29,
        job: "self-employed",
        pdays: 999,
        "emp.var.rate": -3.4,
        "nr.employed": 5017.5,
      }),
    );
  });

  it("renders an API error", async () => {
    const user = userEvent.setup();
    mockedPredict.mockRejectedValue(new ApiError("Prediction service is temporarily unavailable.", 503, "model_unavailable"));
    renderPredict();
    await user.click(screen.getByRole("button", { name: "Load example customer" }));
    await user.click(screen.getByRole("button", { name: "Generate assessment" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Prediction service is temporarily unavailable.");
    expect(screen.getByText("Prediction failed")).toBeInTheDocument();
  });

  it("resets the form and clears the result", async () => {
    const user = userEvent.setup();
    mockedPredict.mockResolvedValue(SUCCESS);
    renderPredict();
    await user.click(screen.getByRole("button", { name: "Load example customer" }));
    await user.click(screen.getByRole("button", { name: "Generate assessment" }));
    expect(await screen.findByText("Prioritize Outreach")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Age")).toHaveValue(null);
    expect(screen.getByText("No assessment yet")).toBeInTheDocument();
  });
});

import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { CallListProvider } from "../campaign/callList";
import { CampaignResultProvider } from "../campaign/campaignResult";
import { ToastProvider } from "../components/ui/Toast";
import { CampaignFile } from "../pages/CampaignFile";
import { ApiError, scoreCampaignFile } from "../services/api";
import type { BatchScoreResponse } from "../types/prediction";

vi.mock("../services/api", () => ({
  scoreCampaignFile: vi.fn(),
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

const mockedScore = vi.mocked(scoreCampaignFile);

const SCORED: BatchScoreResponse = {
  summary: {
    file_rows: 2,
    scored_rows: 2,
    invalid_rows: 0,
    invalid_details_truncated: false,
    threshold: 0.7,
    model_name: "Logistic Regression",
    average_probability: 0.522078,
    groups: [
      {
        decision: "priority",
        label: "Contact first",
        decision_label: "Prioritize Outreach",
        count: 1,
        share: 0.5,
        average_probability: 0.771695,
        guidance: "Call these customers before the rest of the file.",
      },
      {
        decision: "lower_priority",
        label: "Contact later",
        decision_label: "Lower Priority",
        count: 1,
        share: 0.5,
        average_probability: 0.272461,
        guidance: "A lower priority is not a refusal.",
      },
    ],
    ignored_columns: ["duration"],
    notes: ["Call duration was in the file and was not used."],
    disclaimer: "Prediction is a probabilistic decision-support signal.",
  },
  records: [
    {
      row_number: 3,
      probability: 0.771695,
      decision: "priority",
      decision_label: "Prioritize Outreach",
      above_threshold: true,
      age: 29,
      job: "self-employed",
      marital: "single",
      education: "university.degree",
      default: "no",
      housing: "yes",
      loan: "no",
      contact: "cellular",
      month: "sep",
      day_of_week: "tue",
      campaign: 2,
      pdays: 999,
      previous: 0,
      poutcome: "nonexistent",
      "emp.var.rate": -3.4,
      "cons.price.idx": 92.379,
      "cons.conf.idx": -29.8,
      euribor3m: 0.788,
      "nr.employed": 5017.5,
    },
    {
      row_number: 2,
      probability: 0.272461,
      decision: "lower_priority",
      decision_label: "Lower Priority",
      above_threshold: false,
      age: 56,
      job: "housemaid",
      marital: "married",
      education: "basic.4y",
      default: "no",
      housing: "no",
      loan: "no",
      contact: "telephone",
      month: "may",
      day_of_week: "mon",
      campaign: 1,
      pdays: 999,
      previous: 0,
      poutcome: "nonexistent",
      "emp.var.rate": 1.1,
      "cons.price.idx": 93.994,
      "cons.conf.idx": -36.4,
      euribor3m: 4.857,
      "nr.employed": 5191,
    },
  ],
  invalid: [],
};

function renderFile(options?: { clearStorage?: boolean }) {
  if (options?.clearStorage !== false) {
    localStorage.clear();
  }
  return render(
    <ToastProvider>
      <CallListProvider>
        <CampaignResultProvider>
          <MemoryRouter>
            <CampaignFile />
          </MemoryRouter>
        </CampaignResultProvider>
      </CallListProvider>
    </ToastProvider>,
  );
}

function DeskSwitch() {
  const [onFilePage, setOnFilePage] = useState(true);
  return (
    <ToastProvider>
      <CallListProvider>
        <CampaignResultProvider>
          <MemoryRouter>
            <button type="button" onClick={() => setOnFilePage(false)}>
              Open another page
            </button>
            <button type="button" onClick={() => setOnFilePage(true)}>
              Return to campaign file
            </button>
            {onFilePage ? <CampaignFile /> : <p>Overview</p>}
          </MemoryRouter>
        </CampaignResultProvider>
      </CallListProvider>
    </ToastProvider>
  );
}

describe("campaign file scoring", () => {
  beforeEach(() => {
    mockedScore.mockReset();
  });

  it("scores an uploaded file and groups the rows by outreach priority", async () => {
    mockedScore.mockResolvedValue(SCORED);
    const user = userEvent.setup();
    renderFile();

    const input = screen.getByLabelText("Customer file");
    const file = new File(["age,job\n"], "customers.csv", { type: "text/csv" });
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Score file" }));

    expect(mockedScore).toHaveBeenCalledWith(file);
    expect(await screen.findByText("77.2%")).toBeInTheDocument();
    expect(screen.getByText("27.2%")).toBeInTheDocument();
    expect(screen.getByText("29-year-old self-employed, contacted in September")).toBeInTheDocument();
    expect(screen.getByText(/not a bad customer/i)).toBeInTheDocument();
    expect(screen.getByText("Call duration was in the file and was not used.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1 contact first, 1 contact later" })).toBeInTheDocument();
    expect(screen.getByText("Score distribution")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add row 3 to today's call list" }));
    expect(screen.getByRole("button", { name: "Row 3 is on today's call list" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Still to add" }));
    expect(screen.queryByText("29-year-old self-employed, contacted in September")).not.toBeInTheDocument();
    expect(screen.getByText("56-year-old housemaid, contacted in May")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All scored" }));

    await user.click(screen.getByRole("button", { name: "Contact later" }));
    expect(screen.queryByText("29-year-old self-employed, contacted in September")).not.toBeInTheDocument();
    expect(screen.getByText("56-year-old housemaid, contacted in May")).toBeInTheDocument();
  });

  it("keeps the scored file when the officer opens another page", async () => {
    mockedScore.mockResolvedValue(SCORED);
    const user = userEvent.setup();
    localStorage.clear();
    const view = render(<DeskSwitch />);

    const file = new File(["age,job\n"], "customers.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText("Customer file"), file);
    await user.click(screen.getByRole("button", { name: "Score file" }));
    expect(await screen.findByText("77.2%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open another page" }));
    expect(screen.queryByText("77.2%")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Return to campaign file" }));
    expect(screen.getByText("77.2%")).toBeInTheDocument();
    expect(screen.getByText(/customers.csv is the last scored file/i)).toBeInTheDocument();

    view.unmount();
    renderFile({ clearStorage: false });
    expect(screen.getByText("77.2%")).toBeInTheDocument();
    expect(screen.getByText(/customers.csv is the last scored file/i)).toBeInTheDocument();
    expect(screen.getByText(/reload this one/i)).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  });

  it("shows the service error when the file cannot be scored", async () => {
    mockedScore.mockRejectedValue(new ApiError("The file is missing required columns: month.", 422, "validation_error"));
    const user = userEvent.setup();
    renderFile();
    await user.upload(screen.getByLabelText("Customer file"), new File(["age\n"], "bad.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: "Score file" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("missing required columns");
  });
});

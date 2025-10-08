import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

describe("App", () => {
  test("renders columns and adds a To Do item", async () => {
    render(<App />);

    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();

    const input = screen.getAllByPlaceholderText("Type")[0];
    await userEvent.type(input, "Write tests");
    await userEvent.click(screen.getAllByRole("button", { name: /add/i })[0]);

    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  test("marks an item as done via the item menu", async () => {
    render(<App />);
  
    // Add an item
    const input = screen.getAllByPlaceholderText("Type")[0];
    await userEvent.type(input, "Finish task");
    await userEvent.click(screen.getAllByRole("button", { name: /add/i })[0]);
  
    const li = screen.getByText("Finish task").closest("li");
    expect(li).not.toHaveClass("done");
  
    // Open the context menu via right-click on the <li>
    fireEvent.contextMenu(li);
  
    // Click "Mark as done"
    const markDone = await screen.findByRole("menuitem", { name: /mark as done/i });
    await userEvent.click(markDone);
  
    +  // Assert it's marked done (re-query to avoid stale reference)
  await waitFor(() => {
  const updatedLi = screen.getByText("Finish task").closest("li");
  expect(updatedLi).toHaveClass("done");
    });
  });
});



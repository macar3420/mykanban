import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FillTextAnimation from "./FillTextAnimation.jsx";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, variants, initial, animate, ...props }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    h1: ({ children, className, variants, initial, animate, ...props }) => (
      <h1 className={className} {...props}>
        {children}
      </h1>
    ),
    p: ({ children, className, variants, initial, animate, ...props }) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
}));

describe("FillTextAnimation", () => {
  it("renders with default props", () => {
    render(<FillTextAnimation />);

    expect(screen.getByText("Hey, Mustafa")).toBeInTheDocument();
    expect(
      screen.getByText("This appears with a fill animation from Framer Motion"),
    ).toBeInTheDocument();
  });

  it("renders with custom text", () => {
    const customText = "Hello, World!";
    render(<FillTextAnimation text={customText} />);

    expect(screen.getByText(customText)).toBeInTheDocument();
  });

  it("renders with custom subtitle", () => {
    const customSubtitle = "Custom subtitle text";
    render(<FillTextAnimation subtitle={customSubtitle} />);

    expect(screen.getByText(customSubtitle)).toBeInTheDocument();
  });

  it("applies custom container class", () => {
    const { container } = render(
      <FillTextAnimation containerClassName="custom-class" />,
    );

    expect(container.querySelector(".fill-animation-wrapper")).toHaveClass(
      "custom-class",
    );
  });

  it("applies custom text class", () => {
    const { container } = render(
      <FillTextAnimation textClassName="custom-text-class" />,
    );

    expect(container.querySelector(".fill-text")).toHaveClass(
      "custom-text-class",
    );
  });

  it("hides subtitle when showSubtitle is false", () => {
    render(<FillTextAnimation showSubtitle={false} />);

    expect(
      screen.queryByText(
        "This appears with a fill animation from Framer Motion",
      ),
    ).not.toBeInTheDocument();
  });

  it("applies custom CSS variables", () => {
    const { container } = render(
      <FillTextAnimation fillColor="#ff0000" backgroundColor="#000000" />,
    );

    const animationContainer = container.querySelector(
      ".fill-animation-container",
    );
    expect(animationContainer).toHaveStyle("--fill-color: #ff0000");
    expect(animationContainer).toHaveStyle("--background-color: #000000");
  });

  it("renders with Rudiment font family", () => {
    const { container } = render(<FillTextAnimation />);

    const textElement = container.querySelector(".fill-text");
    expect(textElement).toHaveStyle(
      'font-family: "Rudiment", "Pencilpete", system-ui, Avenir, Helvetica, Arial, sans-serif',
    );
  });

  it("handles special characters correctly", () => {
    const textWithSpecialChars = "Hello, World! @#$%^&*()";
    render(<FillTextAnimation text={textWithSpecialChars} />);

    expect(screen.getByText(textWithSpecialChars)).toBeInTheDocument();
  });
});

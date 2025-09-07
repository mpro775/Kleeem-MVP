import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import TagsInput from "./TagsInput";

describe("TagsInput", () => {
  it("يعرض التسمية بشكل صحيح", () => {
    render(<TagsInput label="التصنيفات" value={[]} onChange={() => {}} />);
    expect(screen.getByLabelText("التصنيفات")).toBeInTheDocument();
  });

  it("يسمح بإضافة وسوم جديدة", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    function Wrapper() {
      const [tags, setTags] = useState<string[]>([]);
      return (
        <TagsInput
          label="التصنيفات"
          value={tags}
          onChange={(newTags) => {
            setTags(newTags);
            handleChange(newTags);
          }}
        />
      );
    }

    render(<Wrapper />);
    const input = screen.getByLabelText("التصنيفات");
    await user.type(input, "hello{enter}");
    expect(handleChange).toHaveBeenCalledWith(["hello"]);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});


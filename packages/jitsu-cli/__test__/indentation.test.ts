import { removeIndentation } from "../src/lib/indent";

test("jitsu indentation", async () => {
  const text = `
  a:
  
    b:
  `;

  let aligned = removeIndentation(text).split("\n");
  expect(aligned.length).toBe(3);
  expect(aligned[0]).toBe("a:");
  expect(aligned[2]).toBe("  b:");
});

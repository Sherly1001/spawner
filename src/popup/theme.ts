import { createTheme, rem } from "@mantine/core";

// 10-shade brand palette derived from the existing primary #2563eb
// (Tailwind blue 50..900); primaryShade 6 = #2563eb, shade 7 = hover.
const brand: [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
] = [
  "#eff6ff",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
  "#1e3a8a",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: 6,
  colors: { brand },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSizes: {
    xs: rem(10),
    sm: rem(11),
    md: rem(13),
    lg: rem(15),
    xl: rem(17),
  },
  spacing: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),
    lg: rem(10),
    xl: rem(14),
  },
  radius: { sm: rem(4), md: rem(6), lg: rem(8) },
  defaultRadius: "md",
  cursorType: "pointer",
  components: {
    Button: { defaultProps: { size: "xs" } },
    ActionIcon: {
      defaultProps: { size: "md", variant: "subtle", color: "gray" },
    },
    TextInput: { defaultProps: { size: "xs" } },
    Select: { defaultProps: { size: "xs" } },
    Switch: { defaultProps: { size: "sm" } },
    Checkbox: { defaultProps: { size: "xs" } },
    Badge: { defaultProps: { size: "sm" } },
    Tooltip: { defaultProps: { openDelay: 400, withArrow: true, fz: "xs" } },
  },
});

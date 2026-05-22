import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { CSSProperties, ReactNode } from "react";

type Axis = "both" | "y" | "x";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Which axes may scroll. Default "both". */
  axis?: Axis;
}

type OverflowBehavior = "scroll" | "hidden";

function overflowFor(axis: Axis): { x: OverflowBehavior; y: OverflowBehavior } {
  return {
    x: axis === "y" ? "hidden" : "scroll",
    y: axis === "x" ? "hidden" : "scroll",
  };
}

export default function PerfectScrollbar({
  children,
  className,
  style,
  axis = "both",
}: Props) {
  return (
    <OverlayScrollbarsComponent
      className={className}
      style={style}
      defer
      options={{
        overflow: overflowFor(axis),
        scrollbars: {
          theme: "os-theme-spawner",
          autoHide: "scroll",
          autoHideDelay: 800,
          autoHideSuspend: true,
        },
      }}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}

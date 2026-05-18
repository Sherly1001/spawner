import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TipState {
  text: string;
  rect: DOMRect;
  el: HTMLElement;
}

const MARGIN = 4;
const GAP = 6;
const SHOW_DELAY_MS = 400;

export default function TooltipLayer() {
  const [tip, setTip] = useState<TipState | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number | null>(null);

  useEffect(() => {
    const targetEl = (e: Event): HTMLElement | null => {
      const t = e.target as Element | null;
      return t?.closest?.("[data-tip]") as HTMLElement | null;
    };
    const clearTimer = () => {
      if (showTimer.current != null) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
      }
    };
    const show = (e: Event) => {
      const el = targetEl(e);
      if (!el) return;
      const text = el.getAttribute("data-tip");
      if (!text) return;
      clearTimer();
      showTimer.current = window.setTimeout(() => {
        showTimer.current = null;
        setPos(null);
        setTip({ text, rect: el.getBoundingClientRect(), el });
      }, SHOW_DELAY_MS);
    };
    const hide = (e: Event) => {
      if (!targetEl(e)) return;
      clearTimer();
      setTip(null);
      setPos(null);
    };
    const hideAll = () => {
      clearTimer();
      setTip(null);
      setPos(null);
    };
    document.addEventListener("mouseover", show);
    document.addEventListener("mouseout", hide);
    document.addEventListener("focusin", show);
    document.addEventListener("focusout", hide);
    window.addEventListener("scroll", hideAll, true);
    return () => {
      clearTimer();
      document.removeEventListener("mouseover", show);
      document.removeEventListener("mouseout", hide);
      document.removeEventListener("focusin", show);
      document.removeEventListener("focusout", hide);
      window.removeEventListener("scroll", hideAll, true);
    };
  }, []);

  useEffect(() => {
    if (!tip) return;
    const check = () => {
      if (!document.contains(tip.el)) {
        setTip(null);
        setPos(null);
      }
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [tip]);

  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return;
    const tipRect = tipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = tip.rect;

    let top = r.top - tipRect.height - GAP;
    if (top < MARGIN) {
      const below = r.bottom + GAP;
      if (below + tipRect.height + MARGIN <= vh) top = below;
      else top = Math.max(MARGIN, vh - tipRect.height - MARGIN);
    }

    let left = r.left + r.width / 2 - tipRect.width / 2;
    const maxLeft = vw - tipRect.width - MARGIN;
    if (left < MARGIN) left = MARGIN;
    if (left > maxLeft) left = maxLeft;

    setPos({ top, left });
  }, [tip]);

  if (!tip) return null;

  return createPortal(
    <div
      ref={tipRef}
      className="tooltip"
      role="tooltip"
      style={
        pos
          ? { top: pos.top, left: pos.left }
          : { top: -9999, left: -9999, visibility: "hidden" }
      }
    >
      {tip.text}
    </div>,
    document.body,
  );
}

import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  id?: string;
}

const MARGIN = 6;
const GAP = 4;

export default function Select<T extends string>({
  value,
  options,
  onChange,
  className,
  id,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const openMenu = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setMaxHeight(null);
  };
  const commit = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    close();
    triggerRef.current?.focus();
  };

  // Decide placement once on open. The menu is `position: absolute` so it then
  // scrolls with the trigger natively — no per-scroll JS, no repaint lag.
  // Prefer below; flip above when it doesn't fit below and there's more room up.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const t = trigger.getBoundingClientRect();
    const vh = window.innerHeight;
    const spaceBelow = vh - t.bottom - MARGIN - GAP;
    const spaceAbove = t.top - MARGIN - GAP;
    const desired = menu.scrollHeight;

    if (desired > spaceBelow && spaceAbove > spaceBelow) {
      setPlacement("above");
      setMaxHeight(Math.max(0, spaceAbove));
    } else {
      setPlacement("below");
      setMaxHeight(Math.max(0, spaceBelow));
    }
  }, [open]);

  // Close on outside pointerdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option visible.
  useEffect(() => {
    if (!open) return;
    const el = menuRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case "Tab":
        close();
        break;
    }
  };

  return (
    <div ref={wrapRef} className="select">
      <button
        type="button"
        ref={triggerRef}
        id={id}
        className={`select-trigger${className ? " " + className : ""}${
          open ? " open" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="select-value">{selected?.label ?? ""}</span>
        <span className="select-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul
          ref={menuRef}
          className={`select-menu select-${placement}`}
          role="listbox"
          style={
            maxHeight == null
              ? { visibility: "hidden", maxHeight: "none" }
              : { maxHeight }
          }
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`select-option${i === active ? " active" : ""}${
                o.value === value ? " selected" : ""
              }`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(i);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

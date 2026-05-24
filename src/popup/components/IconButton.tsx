import { ActionIcon, type ActionIconProps, Tooltip } from "@mantine/core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Props = ActionIconProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ActionIconProps> & {
    label: string;
    children: ReactNode;
  };

export default function IconButton({ label, children, ...rest }: Props) {
  return (
    <Tooltip label={label}>
      <ActionIcon aria-label={label} {...rest}>
        {children}
      </ActionIcon>
    </Tooltip>
  );
}

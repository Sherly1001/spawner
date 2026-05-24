import { ActionIcon, Group, Title, Tooltip } from "@mantine/core";
import { FaArrowLeft, FaCog, FaGithub } from "react-icons/fa";
import type { View } from "../App";
import IconButton from "./IconButton";

interface Props {
  view: View;
  onToggleSettings: () => void;
}

export default function Header({ view, onToggleSettings }: Props) {
  const onSessions = view === "sessions";
  return (
    <Group justify="space-between" align="center">
      <Title order={1} fz="md">
        Spawner
      </Title>
      <Group gap={4}>
        <IconButton
          label={onSessions ? "Settings" : "Back to sessions"}
          onClick={onToggleSettings}
        >
          {onSessions ? <FaCog /> : <FaArrowLeft />}
        </IconButton>
        <Tooltip label="GitHub repository">
          <ActionIcon
            component="a"
            href="https://github.com/Sherly1001/spawner"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub repository"
          >
            <FaGithub />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}

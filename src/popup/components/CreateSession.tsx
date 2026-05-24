import { Group, TextInput } from "@mantine/core";
import { LuCircleFadingPlus, LuCirclePlus } from "react-icons/lu";
import IconButton from "./IconButton";

interface Props {
  name: string;
  onName: (v: string) => void;
  onCreate: (type: "temp" | "stored") => void;
}

export default function CreateSession({ name, onName, onCreate }: Props) {
  return (
    <Group gap={6} wrap="nowrap" mb="lg">
      <TextInput
        style={{ flex: 1 }}
        placeholder="New session name"
        value={name}
        onChange={(e) => onName(e.currentTarget.value)}
      />
      <IconButton
        label="New temp session"
        variant="filled"
        color="brand"
        onClick={() => onCreate("temp")}
      >
        <LuCircleFadingPlus />
      </IconButton>
      <IconButton
        label="New stored session"
        variant="filled"
        color="brand"
        onClick={() => onCreate("stored")}
      >
        <LuCirclePlus />
      </IconButton>
    </Group>
  );
}

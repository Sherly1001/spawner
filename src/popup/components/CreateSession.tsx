import { LuCircleFadingPlus, LuCirclePlus } from "react-icons/lu";

interface Props {
  name: string;
  onName: (v: string) => void;
  onCreate: (type: "temp" | "stored") => void;
}

export default function CreateSession({ name, onName, onCreate }: Props) {
  return (
    <section className="create">
      <input
        placeholder="New session name"
        value={name}
        onChange={(e) => onName(e.target.value)}
      />
      <button
        className="primary"
        data-tip="New temp session"
        aria-label="New temp session"
        onClick={() => onCreate("temp")}
      >
        <LuCircleFadingPlus />
      </button>
      <button
        className="primary"
        data-tip="New stored session"
        aria-label="New stored session"
        onClick={() => onCreate("stored")}
      >
        <LuCirclePlus />
      </button>
    </section>
  );
}

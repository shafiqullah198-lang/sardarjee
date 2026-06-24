import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CRIMSON } from "@/app/constants";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  iconClassName?: string;
};

export function PasswordInput({
  className,
  iconClassName,
  style,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative w-full">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`block w-full box-border ${className ?? ""}`}
        style={{ ...style, paddingRight: "3rem" }}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className={`absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-[#7d0020]/10 focus:outline-none focus:ring-2 focus:ring-[#7d0020]/20 ${iconClassName ?? ""}`}
        style={{ color: iconClassName ? undefined : CRIMSON }}
      >
        <Icon className="h-4 w-4" />
      </button>
    </div>
  );
}

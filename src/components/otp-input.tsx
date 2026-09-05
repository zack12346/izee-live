"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function OtpInput({ value, onChange, disabled = false, autoFocus = true }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("").map((digit) => digit.trim());

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setDigit(index: number, digit: string) {
    const next = digits;
    next[index] = digit.replace(/\D/g, "").slice(-1);
    onChange(next.join(""));
    if (next[index] && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return <div dir="ltr" className="flex justify-center gap-2 sm:gap-3">{digits.map((digit, index) => <Input key={index} ref={(element) => { refs.current[index] = element; }} value={digit} onChange={(event) => setDigit(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} onPaste={handlePaste} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} disabled={disabled} aria-label={`رمز التحقق ${index + 1}`} className="size-11 rounded-xl border-zinc-700 bg-zinc-950 text-center text-xl font-black text-white focus:border-amber-400 sm:size-14" />)}</div>;
}

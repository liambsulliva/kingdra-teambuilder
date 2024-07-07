import { Toast, ToastToggle } from "flowbite-react";
import { HiFire } from "react-icons/hi";

export default function Component() {
  return (
    <Toast className="fixed left-2 bottom-2 z-50">
      <div className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-500 dark:bg-cyan-800 dark:text-cyan-200">
        <HiFire className="h-5 w-5 fixed" />
      </div>
      <div className="ml-3 text-sm font-normal">Set yourself free.</div>
      <ToastToggle />
    </Toast>
  );
}
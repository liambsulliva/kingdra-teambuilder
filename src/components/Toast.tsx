import { Toast, ToastToggle } from "flowbite-react";
import { HiX } from "react-icons/hi";

export default function Component( enableToast: { enabled: boolean, message: string }) {

  return (
    <div className={`fixed left-2 bottom-2 z-50 transition-opacity duration-250 ${enableToast.enabled ? 'opacity-100' : 'opacity-0'}`}>
        <Toast>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
                <HiX className="h-5 w-5" />
            </div>
            <div className="ml-3 text-sm font-normal">{enableToast.message}</div>
            <ToastToggle />
        </Toast>
    </div>
  );
}
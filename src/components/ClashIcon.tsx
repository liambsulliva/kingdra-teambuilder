import type { SVGProps } from "react";

interface ClashIconProps extends SVGProps<SVGSVGElement> {
  selectedTab?: string;
}

export default function MaterialSymbolsSwords({
  selectedTab,
  ...props
}: ClashIconProps) {
  const fill = selectedTab === "right" ? "white" : "black";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.5rem"
      height="1.5rem"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill={fill}
        d="m19.05 21.6l-2.925-2.9l-2.2 2.2l-.7-.7q-.575-.575-.575-1.425t.575-1.425l4.225-4.225q.575-.575 1.425-.575t1.425.575l.7.7l-2.2 2.2l2.9 2.925q.3.3.3.7t-.3.7l-1.25 1.25q-.3.3-.7.3t-.7-.3M22 5.9L10.65 17.25l.125.1q.575.575.575 1.425t-.575 1.425l-.7.7l-2.2-2.2l-2.925 2.9q-.3.3-.7.3t-.7-.3L2.3 20.35q-.3-.3-.3-.7t.3-.7l2.9-2.925l-2.2-2.2l.7-.7q.575-.575 1.425-.575t1.425.575l.1.125L18 1.9h4zM6.95 10.85L2 5.9v-4h4l4.95 4.95z"
      ></path>
    </svg>
  );
}

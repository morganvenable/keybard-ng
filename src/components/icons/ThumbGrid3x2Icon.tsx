import { SVGProps } from "react";

const ThumbGrid3x2Icon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
        aria-hidden="true"
    >
        <rect x="3" y="9" width="18" height="12" rx="2" ry="2" />
        <path d="M3 15h18" />
        <path d="M9 9v12" />
        <path d="M15 9v12" />
    </svg>
);

export default ThumbGrid3x2Icon;

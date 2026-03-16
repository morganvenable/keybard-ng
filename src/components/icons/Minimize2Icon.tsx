import React from "react";

interface Minimize2IconProps {
    className?: string;
}

const Minimize2Icon: React.FC<Minimize2IconProps> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m14 10 7-7" />
        <path d="M20 10h-6V4" />
        <path d="m3 21 7-7" />
        <path d="M4 14h6v6" />
    </svg>
);

export default Minimize2Icon;

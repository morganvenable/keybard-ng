import { SVGProps } from "react";

const AtomActiveIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        aria-hidden="true"
    >
        <path d="M20.2,20.2c2.04-2.03.02-7.36-4.5-11.9C11.16,3.78,5.83,1.76,3.8,3.8c-2.04,2.03-.02,7.36,4.5,11.9,4.54,4.52,9.87,6.54,11.9,4.5Z" />
        <path d="M15.7,15.7c4.52-4.54,6.54-9.87,4.5-11.9-2.03-2.04-7.36-.02-11.9,4.5C3.78,12.84,1.76,18.17,3.8,20.2c2.03,2.04,7.36.02,11.9-4.5Z" />
    </svg>
);

export default AtomActiveIcon;

export default function Logo() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width={30} height={30}
             className="me-1 rounded-[5px] transition-all group-data-collapsible:size-7 group-data-[collapsible=icon]:size-8"
             aria-labelledby="eveToolLogoTitle eveToolLogoDesc"><title>EVE Toolkit</title>
            <defs>
                <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#020617"/>
                    <stop offset="100%" stop-color="#020617"/>
                </linearGradient>
                <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#22d3ee"/>
                    <stop offset="100%" stop-color="#6366f1"/>
                </linearGradient>
                <linearGradient id="d" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#e5faff"/>
                    <stop offset="100%" stop-color="#a5b4fc"/>
                </linearGradient>
                <filter id="c" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="4" result="blur"/>
                    <feColorMatrix in="blur" values="0 0 0 0 0.13 0 0 0 0 0.88 0 0 0 0 0.98 0 0 0 0.6 0"/>
                </filter>
            </defs>
            <rect x="8" y="8" width="112" height="112" rx="24" fill="url(#a)"/>
            <path d="M32 20v88m32-88v88m32-88v88M20 32h88M20 64h88M20 96h88" opacity=".12" stroke="#1f2937"/>
            <circle cx="64" cy="64" r="42" fill="url(#b)" opacity=".45" filter="url(#c)"/>
            <path fill="#020617" stroke="url(#b)" stroke-width="3" d="m0-40 34.6 20v40L0 40l-34.6-20v-40z"
                  transform="translate(64 64)"/>
            <path fill="none" stroke="#0f172a" stroke-width="2" d="m64 34 26 15v30L64 94 38 79V49z"/>
            <g fill="url(#d)" transform="translate(64 64)">
                <rect x="-16" y="-12" width="32" height="4.5" rx="2"/>
                <rect x="-11" y="-2" width="22" height="4.5" rx="2"/>
                <rect x="-16" y="8" width="32" height="4.5" rx="2"/>
            </g>
            <rect x="8.5" y="8.5" width="111" height="111" rx="24" fill="none" stroke="#0b1120"/>
        </svg>
    );
}

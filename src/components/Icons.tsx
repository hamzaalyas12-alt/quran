import React from 'react';

/**
 * Halqa Tracker - Authentic Brand & Cultural SVGs
 * 100% offline, zero network requests.
 */
export const HalqaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Halqa Tracker Emblem"
  >
    {/* Outer circle */}
    <circle cx="50" cy="50" r="46" stroke="#0F766E" strokeWidth="4" fill="#FDF9F0" />
    <circle cx="50" cy="50" r="42" stroke="#0F766E" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" fill="none" />
    {/* Amber Accent Dot at top center */}
    <circle cx="50" cy="21" r="4" fill="#F59E0B" />
    {/* Center Spine Marker */}
    <line x1="50" y1="28" x2="50" y2="44" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" />
    {/* Open Quran pages */}
    <path
      d="M50 44 C42 36 28 35 26 36 L26 56 C28 55 42 56 50 64 C58 56 72 55 74 56 L74 36 C72 35 58 36 50 44 Z"
      fill="#FFFFFF"
      stroke="#0F766E"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    {/* Gold page edge highlights */}
    <path d="M28 40 C36 39 46 41 50 46" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    <path d="M72 40 C64 39 54 41 50 46" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    {/* Rehal (Quran Wooden Stand) Base */}
    <path
      d="M26 63 L49 57 M74 63 L51 57 M36 60 L28 66 M64 60 L72 66"
      stroke="#0F766E"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Subtle Islamic Geometric Star Pattern (used at ~5% opacity for backgrounds)
 */
export const IslamicGeometricPattern: React.FC<{ opacity?: number; className?: string }> = ({
  opacity = 0.05,
  className = ''
}) => (
  <div
    className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
    style={{ opacity }}
    aria-hidden="true"
  >
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="islamic-geo-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
          <g stroke="#0F766E" strokeWidth="1" fill="none">
            {/* 8-point geometric star mesh */}
            <rect x="20" y="20" width="40" height="40" />
            <rect x="20" y="20" width="40" height="40" transform="rotate(45 40 40)" />
            <circle cx="40" cy="40" r="16" />
            <line x1="0" y1="40" x2="80" y2="40" />
            <line x1="40" y1="0" x2="40" y2="80" />
            <line x1="0" y1="0" x2="80" y2="80" />
            <line x1="80" y1="0" x2="0" y2="80" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#islamic-geo-pattern)" />
    </svg>
  </div>
);

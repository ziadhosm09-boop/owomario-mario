import { cn } from "@/lib/utils";

interface LiquidSphereProps {
  value: number; // 0-100
  className?: string;
}

export const LiquidSphere = ({ value, className }: LiquidSphereProps) => {
  // Calculate the liquid level (inverted - higher value = more liquid)
  const liquidLevel = 100 - value;
  
  return (
    <div className={cn("relative w-24 h-24", className)}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-lg"
      >
        <defs>
          {/* Gradient for the liquid */}
          <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(220 90% 56%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(280 85% 60%)" stopOpacity="0.95" />
          </linearGradient>
          
          {/* Shine gradient for glass effect */}
          <radialGradient id="shineGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="50%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          {/* Clip path for the sphere */}
          <clipPath id="sphereClip">
            <circle cx="50" cy="50" r="45" />
          </clipPath>

          {/* Wave pattern */}
          <pattern id="wave" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M0 10 Q 12.5 5, 25 10 T 50 10 T 75 10 T 100 10 L 100 20 L 0 20 Z"
              fill="url(#liquidGradient)"
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-50 0"
                to="0 0"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>
          </pattern>
        </defs>

        {/* Outer sphere border */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(220 18% 25%)"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Liquid container with clip */}
        <g clipPath="url(#sphereClip)">
          {/* Main liquid fill */}
          <rect
            x="0"
            y={liquidLevel}
            width="100"
            height={100 - liquidLevel}
            fill="url(#liquidGradient)"
            className="transition-all duration-1000 ease-linear"
          />
          
          {/* Wave effect on top of liquid */}
          <rect
            x="0"
            y={liquidLevel - 10}
            width="100"
            height="20"
            fill="url(#wave)"
            className="transition-all duration-1000 ease-linear"
          />

          {/* Bubbles effect */}
          {value > 30 && (
            <>
              <circle cx="30" cy={liquidLevel + 20} r="2" fill="white" opacity="0.4">
                <animate
                  attributeName="cy"
                  from={liquidLevel + 20}
                  to={liquidLevel - 10}
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.4;0.6;0.4" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="70" cy={liquidLevel + 35} r="1.5" fill="white" opacity="0.3">
                <animate
                  attributeName="cy"
                  from={liquidLevel + 35}
                  to={liquidLevel - 5}
                  dur="4s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite" />
              </circle>
            </>
          )}
        </g>

        {/* Glass shine effect */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#shineGradient)"
          pointerEvents="none"
        />

        {/* Inner sphere border for depth */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(220 90% 56% / 0.3)"
          strokeWidth="1"
        />
      </svg>
      
      {/* Drop effect when liquid is low */}
      {value < 20 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
          <div className="w-2 h-3 bg-gradient-primary rounded-full opacity-60 animate-pulse" />
        </div>
      )}
    </div>
  );
};

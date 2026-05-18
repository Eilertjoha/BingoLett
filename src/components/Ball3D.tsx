import { getBingoInfo } from '../lib/bingo';
import { motion } from 'motion/react';

export default function Ball3D({ number, size = 'lg' }: { number: number | null, size?: 'sm' | 'md' | 'lg' | 'xl' | 'fill' }) {
  if (number === null) return null;
  const { letter, color } = getBingoInfo(number);

  const getGlowColor = (color: string) => {
    switch (color) {
      case 'cyan': return 'rgba(34, 211, 238, 0.6)';
      case 'pink': return 'rgba(236, 72, 153, 0.6)';
      case 'green': return 'rgba(74, 222, 128, 0.6)';
      case 'purple': return 'rgba(192, 132, 252, 0.6)';
      case 'yellow': return 'rgba(250, 204, 21, 0.6)';
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  };

  const getBorderColor = (color: string) => {
    switch (color) {
      case 'cyan': return 'border-cyan-400';
      case 'pink': return 'border-pink-400';
      case 'green': return 'border-green-400';
      case 'purple': return 'border-purple-400';
      case 'yellow': return 'border-yellow-400';
      default: return 'border-white/20';
    }
  };

  const getTextColor = (color: string) => {
    switch (color) {
      case 'cyan': return 'text-cyan-400';
      case 'pink': return 'text-pink-400';
      case 'green': return 'text-green-400';
      case 'purple': return 'text-purple-400';
      case 'yellow': return 'text-yellow-400';
      default: return 'text-white/20';
    }
  };

  const getSvgFillColor = (color: string) => {
    switch (color) {
      case 'cyan': return '#22d3ee';
      case 'pink': return '#f472b6';
      case 'green': return '#4ade80';
      case 'purple': return '#c084fc';
      case 'yellow': return '#facc15';
      default: return '#ffffff';
    }
  };

  const glowColor = getGlowColor(color);
  const borderColor = getBorderColor(color);
  const textColor = getTextColor(color);
  const svgFillColor = getSvgFillColor(color);

  // Added fill size for the huge main ball to match box size
  const containerClasses = {
    sm: 'w-16 h-16 sm:w-20 sm:h-20',
    md: 'w-24 h-24 sm:w-28 sm:h-28', // Increased size for Siste 3
    lg: 'w-48 h-48 sm:w-64 sm:h-64',
    xl: 'w-[320px] h-[320px]',
    fill: 'w-full h-full aspect-square max-h-full',
  }[size];

  const textClasses = {
    sm: 'text-3xl sm:text-4xl',
    md: 'text-4xl sm:text-5xl',
    lg: 'text-7xl sm:text-[110px] lg:text-[130px]',
    xl: 'text-[150px]',
    fill: 'text-[15vmin] sm:text-[12vmin] lg:text-[10vmin]',
  }[size];

  return (
    <motion.div
      layout
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        boxShadow: `0 0 ${size === 'lg' || size === 'xl' || size === 'fill' ? '60px' : '30px'} ${glowColor}`,
        containerType: 'size'
      }}
      className={`relative flex items-center justify-center rounded-full overflow-hidden shrink-0 border sm:border-2 ${borderColor} ${containerClasses} bg-gradient-to-br from-gray-800 via-[#111] to-black`}
    >
      <div
        className="absolute inset-0 rounded-full border border-white/20 pointer-events-none"
        style={{ boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.8), inset 0 2px 15px rgba(255,255,255,0.3)' }}
      ></div>

      <img
        src={`${import.meta.env.BASE_URL}glass_orb_${letter}.webp`}
        alt={`${letter} skin`}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
        style={{ transform: 'scale(1.25)' }}
      />

      <div className="relative z-10 w-full h-full flex items-center justify-center font-bold tracking-tighter drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
        <div style={{ fontSize: 'min(42cqw, 42cqh)', lineHeight: 1 }}>
          <span className={textColor}>{letter}</span>
          <span className="text-white">{number}</span>
        </div>
      </div>
    </motion.div>
  );
}

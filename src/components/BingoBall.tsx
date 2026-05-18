import { motion } from 'motion/react';
import { getBingoInfo } from '../lib/bingo';

interface BingoBallProps {
  number: number | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLetter?: boolean;
}

export default function BingoBall({ number, size = 'lg', showLetter = true }: BingoBallProps) {
  if (number === null) {
    const sizeClasses = {
      sm: 'w-12 h-12 border-2 text-[10px]',
      md: 'w-24 h-24 border-4 text-2xl',
      lg: 'w-48 h-48 border-[6px] text-4xl border-white/10 bg-white/5 backdrop-blur-md',
      xl: 'w-64 h-64 sm:w-80 sm:h-80 lg:w-[24rem] lg:h-[24rem] border-[10px] text-5xl border-white/10 bg-white/5 backdrop-blur-md',
    }[size];

    return (
      <div 
        className={`rounded-full flex items-center justify-center flex-col shrink-0 ${sizeClasses}`}
      >
        <span className="font-display font-medium text-white/30 uppercase tracking-widest text-center">
          Klar
        </span>
      </div>
    );
  }

  const { letter, color } = getBingoInfo(number);

  const getBallStyles = (color: string, size: string) => {
    const isSmall = size === 'sm' || size === 'md';
    switch (color) {
      case 'cyan': return {
        text: 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]',
        border: isSmall ? 'border-cyan-500/50' : ''
      };
      case 'pink': return {
        text: 'text-pink-400 drop-shadow-[0_0_15px_rgba(244,114,182,0.5)]',
        border: isSmall ? 'border-pink-500/50' : ''
      };
      case 'green': return {
        text: 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]',
        border: isSmall ? 'border-green-500/50' : ''
      };
      case 'purple': return {
        text: 'text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.5)]',
        border: isSmall ? 'border-purple-500/50' : ''
      };
      case 'yellow': return {
        text: 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]',
        border: isSmall ? 'border-yellow-500/50' : ''
      };
      default: return { text: 'text-white', border: '' };
    }
  };

  const styles = getBallStyles(color, size);

  if (size === 'sm' || size === 'md') {
    const boxSize = size === 'md' ? 'w-20 h-20 md:w-24 md:h-24 text-lg md:text-2xl border-[3px] md:border-4' : 'w-12 h-12 border text-sm';
    return (
      <motion.div
        key={number} 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className={`${boxSize} rounded-full flex items-center justify-center font-bold shrink-0 ${styles.border} ${styles.text.split(' ')[0]}`}
      >
        {letter}-{number}
      </motion.div>
    );
  }

  const isBig = size === 'xl';
  // Use HTML styling for regular ball
  return (
    <motion.div
      key={number} 
      initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`relative flex flex-col items-center justify-center shrink-0 ${isBig ? 'w-full h-full' : 'w-full py-8'}`}
    >
      <div className="flex items-baseline justify-center gap-4 md:gap-8">
        {showLetter && (
          <div className={`${isBig ? 'text-[180px] md:text-[220px]' : 'text-[100px] md:text-[140px]'} font-black tracking-tighter ${styles.text}`}>
            {letter}
          </div>
        )}
        <div className={`${isBig ? 'text-[180px] md:text-[220px]' : 'text-[100px] md:text-[140px]'} font-black leading-none text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}>
          {number}
        </div>
      </div>
      {isBig && (
        <div className="mt-4 flex gap-6 items-center">
           <div className={`w-3 h-3 rounded-full animate-pulse blur-[1px] ${styles.text.split(' ')[0].replace('text', 'bg')}`}></div>
           <span className="text-xs uppercase tracking-[0.3em] font-medium text-white/40">Neste tall klar</span>
        </div>
      )}
    </motion.div>
  );
}

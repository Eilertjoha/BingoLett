import { motion } from 'motion/react';

interface HistoryGridProps {
  drawnNumbers: number[];
  isManualMode?: boolean;
  onManualDraw?: (num: number) => void;
  variant?: 'admin' | 'obs'; // Kept for backwards compatibility but not used for styling
}

export default function HistoryGrid({ drawnNumbers, isManualMode, onManualDraw }: HistoryGridProps) {
  const rows = [
    { letter: 'B', color: 'cyan', start: 1 },
    { letter: 'I', color: 'pink', start: 16 },
    { letter: 'N', color: 'green', start: 31 },
    { letter: 'G', color: 'purple', start: 46 },
    { letter: 'O', color: 'yellow', start: 61 },
  ];

  const getUndrawnClasses = () => {
    return 'bg-white/5 border-transparent text-white/20';
  };
  
  const getDrawnClasses = (color: string) => {
    switch (color) {
      case 'cyan': return 'bg-transparent text-white shadow-[0_0_15px_rgba(34,211,238,0.5)] border-cyan-400';
      case 'pink': return 'bg-transparent text-white shadow-[0_0_15px_rgba(244,114,182,0.5)] border-pink-400';
      case 'green': return 'bg-transparent text-white shadow-[0_0_15px_rgba(74,222,128,0.5)] border-green-400';
      case 'purple': return 'bg-transparent text-white shadow-[0_0_15px_rgba(192,132,252,0.5)] border-purple-400';
      case 'yellow': return 'bg-transparent text-white shadow-[0_0_15px_rgba(250,204,21,0.5)] border-yellow-400';
      default: return '';
    }
  };

  const getHeaderColor = (color: string) => {
    switch (color) {
      case 'cyan': return 'text-cyan-400';
      case 'pink': return 'text-pink-400';
      case 'green': return 'text-green-400';
      case 'purple': return 'text-purple-400';
      case 'yellow': return 'text-yellow-400';
      default: return '';
    }
  };

  return (
    <div className="flex-1 w-full bg-black/50 rounded-[30px] p-2 sm:p-4 lg:p-6 flex flex-col min-h-0 relative">
      {/* Outer gradient border (Cyan to Pink) wrapper */}
      <div className="absolute inset-0 rounded-[30px] border-2 border-transparent" style={{
        background: 'linear-gradient(to right, #22d3ee, #f472b6) border-box',
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        opacity: 0.8
      }} />
      
      <div className="relative z-10 flex flex-col justify-between flex-1 gap-2 lg:gap-4 w-full h-full min-h-0">
        {rows.map((row) => (
          <div key={row.letter} className="flex items-center gap-2 sm:gap-4 w-full flex-1 min-h-0">
            <div 
              className={`w-[8%] min-w-[30px] max-w-[80px] h-full flex items-center justify-center font-black ${getHeaderColor(row.color)} uppercase shrink-0`}
            >
              <span className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl leading-[1] drop-shadow-sm" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}>{row.letter}</span>
            </div>
            
            <div className="flex-1 grid gap-1.5 sm:gap-2 h-full" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
              {Array.from({ length: 15 }, (_, i) => row.start + i).map((num) => {
                const isDrawn = drawnNumbers.includes(num);
                const colorClasses = isDrawn ? getDrawnClasses(row.color) : getUndrawnClasses();
                
                return (
                  <motion.div
                    key={num}
                    initial={false}
                    onClick={() => {
                        if (isManualMode && !isDrawn && onManualDraw) {
                            onManualDraw(num);
                        }
                    }}
                    animate={{ scale: isDrawn ? [1, 1.1, 1] : 1 }}
                    transition={{ duration: 0.4 }}
                    className={`rounded-lg border flex items-center justify-center font-black tracking-tighter transition-all duration-300 w-full h-full min-h-0 border-opacity-30 ${colorClasses} ${isManualMode && !isDrawn ? 'cursor-pointer hover:bg-white/20 hover:border-white/50 active:scale-95' : ''}`}
                  >
                    <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl leading-[1]">{num}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { uploadUrl } from '../api';

function Flashcard({ card, index, total }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="flip-card w-full h-[360px] xl:h-[440px] cursor-pointer select-none"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* Front - Term */}
        <div className="flip-card-front flex flex-col bg-[#141416] border border-white/5 rounded-2xl p-8">
          <div className="absolute top-4 right-4 text-xs text-zinc-600">
            {index + 1} / {total}
          </div>
          <div className="absolute top-4 left-4 text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
            Term
          </div>
          <div className="flex-1 flex flex-col items-center overflow-y-auto mt-4 mb-4">
            <div className="my-auto flex flex-col items-center gap-4">
              {card.term_image && (
                <img
                  src={uploadUrl(card.term_image)}
                  alt=""
                  className="max-h-32 rounded-xl object-contain shrink-0"
                />
              )}
              <p className="text-xl md:text-2xl font-semibold text-white text-center leading-relaxed">
                {card.term}
              </p>
            </div>
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-700 whitespace-nowrap">Click to flip</p>
        </div>

        {/* Back - Definition */}
        <div className="flip-card-back flex flex-col bg-[#18181b] border border-white/5 rounded-2xl p-8">
          <div className="absolute top-4 right-4 text-xs text-zinc-600">
            {index + 1} / {total}
          </div>
          <div className="absolute top-4 left-4 text-[10px] uppercase tracking-widest text-indigo-400 font-medium">
            Definition
          </div>
          <div className="flex-1 flex flex-col items-center overflow-y-auto mt-4 mb-4">
            <div className="my-auto flex flex-col items-center gap-4">
              {card.definition_image && (
                <img
                  src={uploadUrl(card.definition_image)}
                  alt=""
                  className="max-h-32 rounded-xl object-contain shrink-0"
                />
              )}
              <p className="text-lg md:text-xl text-zinc-300 text-center leading-relaxed">
                {card.definition}
              </p>
            </div>
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-700 whitespace-nowrap">Click to flip</p>
        </div>
      </div>
    </div>
  );
}

export default Flashcard;

import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import './AnimatedHeadline.css';

type AnimatedSegmentProps = {
  text: string;
  className?: string;
  delay: number;
  reducedMotion: boolean;
};

function AnimatedSegment({ text, className = '', delay, reducedMotion }: AnimatedSegmentProps) {
  const words = text.split(' ');
  let offset = 0;

  return (
    <span className={'headline-segment ' + className}>
      {words.map((word, wordIndex) => {
        const firstCharacter = offset;
        offset += Array.from(word).length + 1;

        return (
          <span className="headline-word" key={wordIndex}>
            {Array.from(word).map((character, characterIndex) => (
              <motion.span
                className="headline-letter"
                aria-hidden="true"
                key={characterIndex}
                style={{ transformOrigin: '50% 100%' } as CSSProperties}
                initial={reducedMotion ? false : {
                  opacity: 0.58,
                  y: 16,
                  rotateX: -18,
                }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={reducedMotion ? { duration: 0 } : {
                  delay: delay + (firstCharacter + characterIndex) * 0.043,
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {character}
              </motion.span>
            ))}
            {wordIndex < words.length - 1 && <span className="headline-space" aria-hidden="true" />}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The single aria-label gives screen readers the complete headline once;
 * the animated individual letters are decorative, not individual announcements.
 * Reduced-motion users receive the same headline immediately.
 */
export default function AnimatedHeadline() {
  const reducedMotion = useReducedMotion() === true;

  return (
    <h1
      className="animated-headline"
      aria-label="See beyond sight. Hear the world."
    >
      <span className="headline-line" aria-hidden="true">
        <AnimatedSegment text="See beyond sight." delay={0.18} reducedMotion={reducedMotion} />
      </span>
      <span className="headline-line headline-line-second" aria-hidden="true">
        <AnimatedSegment
          text="Hear the"
          className="title-light"
          delay={0.83}
          reducedMotion={reducedMotion}
        />
        <span className="headline-accent-wrap">
          <AnimatedSegment
            text="world."
            className="title-accent headline-glow"
            delay={1.18}
            reducedMotion={reducedMotion}
          />
          <span className="headline-underline" aria-hidden="true" />
        </span>
      </span>
    </h1>
  );
}

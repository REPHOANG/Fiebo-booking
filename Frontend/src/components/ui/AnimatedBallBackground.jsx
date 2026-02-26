import React from 'react';
import { motion } from 'framer-motion';
import './AnimatedBallBackground.css';

import ballFootball from '../../assets/images/Bóng đá.png';
import ballBasketball from '../../assets/images/Bóng rổ.png';
import ballVolleyball from '../../assets/images/Bóng chuyền.png';
import ballTennis from '../../assets/images/Bóng tenis.png';

// Tạo ngẫu nhiên một lần khi file được import
const createBalls = () => {
  const baseBalls = [ballFootball, ballBasketball, ballVolleyball, ballTennis];

  return Array.from({ length: 12 }).map((_, index) => {
    const image = baseBalls[index % baseBalls.length];

    const size = 50 + Math.random() * 70; // 50 - 120px
    const startX = Math.random() * 100; // theo % viewport
    const startY = Math.random() * 100;
    const offsetX = (Math.random() * 40 + 20) * (Math.random() > 0.5 ? 1 : -1); // +/− 20–60%
    const offsetY = (Math.random() * 40 + 20) * (Math.random() > 0.5 ? 1 : -1);

    return {
      id: index + 1,
      image,
      size,
      startX,
      startY,
      offsetX,
      offsetY,
      duration: 18 + Math.random() * 10, // 18–28s
      delay: Math.random() * 5,
    };
  });
};

const balls = createBalls();

const AnimatedBallBackground = () => {
  return (
    <div className="animated-ball-background">
      {balls.map((ball) => (
        <motion.div
          key={ball.id}
          className="floating-ball"
          style={{
            width: `${ball.size}px`,
            height: `${ball.size}px`,
            top: `${ball.startY}%`,
            left: `${ball.startX}%`,
            transform:
              ball.size >= 90 ? 'scale(1.1)' : ball.size <= 60 ? 'scale(0.9)' : 'scale(1)',
            opacity: ball.size >= 90 ? 0.9 : ball.size <= 60 ? 0.55 : 0.7,
          }}
          animate={{
            x: [`0%`, `${ball.offsetX}%`],
            y: [`0%`, `${ball.offsetY}%`],
            rotate: [0, 360],
          }}
          transition={{
            duration: ball.duration,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: ball.delay,
          }}
        >
          <img
            src={ball.image}
            alt={`Ball ${ball.id}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default AnimatedBallBackground;

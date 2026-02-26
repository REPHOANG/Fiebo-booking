import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const FadeInSection = ({ children, delay = 0 }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.15,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1], // cubic-bezier premium
        delay: delay,
      }}
    >
      {children}
    </motion.div>
  );
};

export default FadeInSection;
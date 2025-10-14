import { motion } from "framer-motion";
import "./FillTextAnimation.css";

const FillTextAnimation = ({
  text = "Hey, Mustafa",
  fillColor = "#4a9eff",
  backgroundColor = "#000000",
  containerClassName = "",
  textClassName = "",
  subtitle = "This appears with a fill animation from Framer Motion",
  showSubtitle = true,
  animationDuration = 4.5,
  delay = 0.5,
}) => {
  // Fill text animation variants with multiple back and forth movements
  const fillTextVariants = {
    hidden: {
      backgroundPosition: "100% 50%",
    },
    visible: {
      backgroundPosition: [
        "100% 50%",
        "55% 50%",
        "75% 50%",
        "30% 50%",
        "50% 50%",
        "0% 50%",
      ],
      transition: {
        duration: animationDuration,
        ease: "easeInOut",
        delay: delay,
        times: [0, 0.2, 0.35, 0.55, 0.7, 1],
      },
    },
  };

  // Container animation
  const containerVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  // Subtitle animation
  const subtitleVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: delay + animationDuration + 1,
        ease: "easeOut",
      },
    },
  };

  // Dynamic CSS variables for customization
  const cssVariables = {
    "--fill-color": fillColor,
    "--background-color": backgroundColor,
  };

  return (
    <div className="fill-animation-container" style={cssVariables}>
      <motion.div
        className={`fill-animation-wrapper ${containerClassName}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className={`fill-text ${textClassName}`}
          variants={fillTextVariants}
          initial="hidden"
          animate="visible"
        >
          {text}
        </motion.h1>

        {showSubtitle && (
          <motion.p
            className="fill-subtitle"
            variants={subtitleVariants}
            initial="hidden"
            animate="visible"
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
};

export default FillTextAnimation;

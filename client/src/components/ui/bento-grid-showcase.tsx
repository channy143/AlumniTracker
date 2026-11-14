"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 14,
    },
  },
};

interface BentoGridShowcaseProps {
  /** Slot for the top-left card (Integrations) */
  integrations: React.ReactNode;
  /** Slot for the top-right card (Feature Tags) */
  featureTags: React.ReactNode;
  /** Slot for the tall middle card (Main Feature) */
  mainFeature: React.ReactNode;
  /** Slot for the middle-left card (Secondary Feature) */
  secondaryFeature: React.ReactNode;
  /** Slot for the middle-right card (Statistic) */
  statistic: React.ReactNode;
  /** Slot for the bottom-left card (Journey) */
  journey: React.ReactNode;
  /** Controls intro/outro animation state */
  revealed?: boolean;
  /** Optional class names for the grid container */
  className?: string;
}

export const BentoGridShowcase = ({
  integrations,
  featureTags,
  mainFeature,
  secondaryFeature,
  statistic,
  journey,
  revealed = true,
  className,
}: BentoGridShowcaseProps) => {
  return (
    <motion.div
      variants={containerVariants}
      initial={false}
      animate={revealed ? "visible" : "hidden"}
      className={cn(
        "grid w-full grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-3 auto-rows-[minmax(130px,auto)]",
        className
      )}
    >
      {/* Column 1: Description (natural height, top-aligned) + 2 Cards expanding to fill remaining space */}
      <div className="md:col-span-1 md:row-span-3 flex flex-col gap-4">
        <motion.div variants={itemVariants} className="shrink-0">
          {integrations}
        </motion.div>
        <motion.div variants={itemVariants} className="flex-1">
          {secondaryFeature}
        </motion.div>
        <motion.div variants={itemVariants} className="flex-1">
          {journey}
        </motion.div>
      </div>

      {/* Column 2: Main Feature (Spans 3 rows) */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-3">
        {mainFeature}
      </motion.div>

      {/* Column 3 Top: Feature Tags */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {featureTags}
      </motion.div>

      {/* Column 3 Bottom: Statistic (Spans 2 rows) */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-2">
        {statistic}
      </motion.div>
    </motion.div>
  );
};


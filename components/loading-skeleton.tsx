'use client';

import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export const ProjectCardSkeleton = ({
  className = '',
}: {
  className?: string;
}) => (
  <div className={`liquid-glass p-6 h-full ${className}`}>
    {/* Image skeleton */}
    <div className="w-full h-48 bg-default-200 dark:bg-default-800 rounded-lg mb-4 skeleton" />

    {/* Content skeleton */}
    <div className="space-y-4">
      {/* Title */}
      <div className="h-6 bg-default-200 dark:bg-default-800 rounded w-3/4 skeleton" />

      {/* Description */}
      <div className="space-y-2">
        <div className="h-4 bg-default-200 dark:bg-default-800 rounded w-full skeleton" />
        <div className="h-4 bg-default-200 dark:bg-default-800 rounded w-2/3 skeleton" />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-4 bg-default-200 dark:bg-default-800 rounded w-1/3 skeleton" />
        <div className="h-2 bg-default-200 dark:bg-default-800 rounded w-full skeleton" />
      </div>

      {/* Badges */}
      <div className="flex gap-2">
        <div className="h-6 bg-default-200 dark:bg-default-800 rounded w-16 skeleton" />
        <div className="h-6 bg-default-200 dark:bg-default-800 rounded w-20 skeleton" />
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-divider">
        <div className="h-4 bg-default-200 dark:bg-default-800 rounded w-24 skeleton" />
      </div>
    </div>
  </div>
);

export const ProjectGridSkeleton = ({ count = 6 }: LoadingSkeletonProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <motion.div
        key={index}
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <ProjectCardSkeleton />
      </motion.div>
    ))}
  </div>
);

export const StatCardSkeleton = () => (
  <div className="liquid-glass p-4 text-center">
    <div className="w-8 h-8 bg-default-200 dark:bg-default-800 rounded mx-auto mb-2 skeleton" />
    <div className="h-8 bg-default-200 dark:bg-default-800 rounded w-12 mx-auto mb-1 skeleton" />
    <div className="h-4 bg-default-200 dark:bg-default-800 rounded w-20 mx-auto skeleton" />
  </div>
);

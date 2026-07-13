import React from 'react';

const ActivityRings = ({
  calories = 0, calorieTarget = 400,
  duration = 0, durationTarget = 45,
  steps = 0, stepTarget = 10000,
  size = 40,
  strokeWidth = 3.5,
  gap = 1.5,
  className = ""
}) => {
  const center = size / 2;
  const radius1 = center - strokeWidth / 2;
  const radius2 = radius1 - strokeWidth - gap;
  const radius3 = radius2 - strokeWidth - gap;

  // Render nothing if size is too small to fit 3 rings
  if (radius3 <= 0) return null;

  const getOffset = (value, target, r) => {
    const safeTarget = target || 1;
    let percent = (value / safeTarget);
    if (percent > 1) percent = 1;
    const circ = 2 * Math.PI * r;
    return circ - (percent * circ);
  };

  const getCirc = (r) => 2 * Math.PI * r;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`transform -rotate-90 ${className}`}>
      {/* Background Rings */}
      <circle cx={center} cy={center} r={radius1} fill="none" stroke="#f43f5e" strokeWidth={strokeWidth} opacity={0.2} />
      <circle cx={center} cy={center} r={radius2} fill="none" stroke="#10b981" strokeWidth={strokeWidth} opacity={0.2} />
      <circle cx={center} cy={center} r={radius3} fill="none" stroke="#3b82f6" strokeWidth={strokeWidth} opacity={0.2} />

      {/* Progress Rings */}
      <circle cx={center} cy={center} r={radius1} fill="none" stroke="#f43f5e" strokeWidth={strokeWidth} 
        strokeDasharray={getCirc(radius1)} strokeDashoffset={getOffset(calories, calorieTarget, radius1)} strokeLinecap="round" />
      <circle cx={center} cy={center} r={radius2} fill="none" stroke="#10b981" strokeWidth={strokeWidth} 
        strokeDasharray={getCirc(radius2)} strokeDashoffset={getOffset(duration, durationTarget, radius2)} strokeLinecap="round" />
      <circle cx={center} cy={center} r={radius3} fill="none" stroke="#3b82f6" strokeWidth={strokeWidth} 
        strokeDasharray={getCirc(radius3)} strokeDashoffset={getOffset(steps, stepTarget, radius3)} strokeLinecap="round" />
    </svg>
  );
};

export default ActivityRings;

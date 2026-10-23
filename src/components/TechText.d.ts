import type { ComponentType, CSSProperties } from "react";

export interface TechTextProps {
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  color?: string;
  accentColor?: string;
  align?: string;
  reach?: number;
  softness?: number;
  dashLength?: number;
  dashGap?: number;
  strokeWidth?: number;
  lineStyle?: string;
  reveal?: string;
  specks?: number;
  selection?: boolean;
  labels?: boolean;
  draggable?: boolean;
  bounce?: number;
  sweep?: boolean;
  speed?: number;
  clickKick?: boolean;
  intro?: string;
  introDuration?: number;
  guides?: boolean;
  className?: string;
  style?: CSSProperties;
}

declare const TechText: ComponentType<TechTextProps>;
export default TechText;

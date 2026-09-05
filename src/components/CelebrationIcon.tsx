import React from 'react';
import {
  Cake,
  Heart,
  Crown,
  Sparkles,
  Baby,
  PartyPopper,
  Music,
  Wind,
  Snowflake,
  UtensilsCrossed,
  GlassWater,
  Camera,
  Gift,
  LucideProps
} from 'lucide-react';

interface IconProps extends LucideProps {
  iconName?: string;
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Maps occasion IDs or icon identifiers to high-quality Lucide icons
 */
export const OccasionIcon: React.FC<IconProps> = ({
  iconName = '',
  size = 24,
  className = '',
  color,
  ...rest
}) => {
  const normalized = iconName.toLowerCase().trim();

  switch (normalized) {
    case 'birthday':
    case 'cake':
      return <Cake size={size} className={className} color={color} {...rest} />;
    case 'anniversary':
    case 'heart':
    case 'ring':
      return <Heart size={size} className={className} color={color} {...rest} />;
    case 'bride_to_be':
    case 'bride-to-be':
    case 'crown':
      return <Crown size={size} className={className} color={color} {...rest} />;
    case 'groom_to_be':
    case 'groom-to-be':
    case 'sparkles':
      return <Sparkles size={size} className={className} color={color} {...rest} />;
    case 'mom_to_be':
    case 'mom-to-be':
    case 'baby':
      return <Baby size={size} className={className} color={color} {...rest} />;
    case 'other':
    case 'party-popper':
    case 'milestone':
      return <PartyPopper size={size} className={className} color={color} {...rest} />;
    default:
      return <PartyPopper size={size} className={className} color={color} {...rest} />;
  }
};

/**
 * Maps amenity IDs or icon identifiers to high-quality Lucide icons
 */
export const AmenityIcon: React.FC<IconProps> = ({
  iconName = '',
  size = 20,
  className = '',
  color,
  ...rest
}) => {
  const normalized = iconName.toLowerCase().trim();

  switch (normalized) {
    case 'basic_decorations':
    case 'decor':
    case 'sparkles':
      return <Sparkles size={size} className={className} color={color} {...rest} />;
    case 'music_mic':
    case 'music':
      return <Music size={size} className={className} color={color} {...rest} />;
    case 'ac_hall':
    case 'wind':
      return <Wind size={size} className={className} color={color} {...rest} />;
    case 'snowflake':
      return <Snowflake size={size} className={className} color={color} {...rest} />;
    case 'cake_cutlery':
    case 'utensils':
    case 'cutlery':
      return <UtensilsCrossed size={size} className={className} color={color} {...rest} />;
    case 'welcome_drinks':
    case 'glass-water':
    case 'drinks':
      return <GlassWater size={size} className={className} color={color} {...rest} />;
    case 'party_poppers_props':
    case 'camera':
    case 'photo-props':
      return <Camera size={size} className={className} color={color} {...rest} />;
    case 'gift':
    case 'combo':
      return <Gift size={size} className={className} color={color} {...rest} />;
    default:
      return <Sparkles size={size} className={className} color={color} {...rest} />;
  }
};

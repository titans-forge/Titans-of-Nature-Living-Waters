import amazon from '../assets/underwater/amazon-root-edge-v1.webp';
import habitat0 from '../assets/underwater/florida-bay-habitat-v2.webp';
import habitat1 from '../assets/underwater/okavango-habitat-v2.webp';
import habitat2 from '../assets/underwater/tonle-sap-habitat-v2.webp';
import habitat3 from '../assets/underwater/alaska-kelp-habitat-v2.webp';
import habitat4 from '../assets/underwater/baikal-habitat-v2.webp';
import habitat5 from '../assets/underwater/lake-holiday-habitat-v2.webp';
import habitat6 from '../assets/underwater/nile-habitat-v2.webp';
import habitat7 from '../assets/underwater/euphrates-habitat-v2.webp';
import habitat8 from '../assets/underwater/ganges-habitat-v2.webp';
import habitat9 from '../assets/underwater/danube-habitat-v2.webp';
import habitat10 from '../assets/underwater/great-barrier-reef-habitat-v2.webp';
import habitat11 from '../assets/underwater/seto-inland-sea-habitat-v2.webp';
import habitat12 from '../assets/underwater/yellow-river-delta-habitat-v2.webp';

/** Reconstructed habitat plates; clarity is enhanced for the educational view. */
export const underwaterHabitatByVenue: Record<string, { src: string; tint: string }> = {
  amazon: { src: amazon, tint: 'rgba(32,63,37,.06)' },
  "florida-bay": { src: habitat0, tint: "rgba(24,78,70,.05)" },
  "okavango": { src: habitat1, tint: "rgba(65,91,49,.08)" },
  "tonle-sap": { src: habitat2, tint: "rgba(61,75,45,.09)" },
  "alaska-kelp": { src: habitat3, tint: "rgba(24,59,72,.08)" },
  "baikal": { src: habitat4, tint: "rgba(27,70,95,.07)" },
  "lake-holiday": { src: habitat5, tint: "rgba(58,80,42,.09)" },
  "nile": { src: habitat6, tint: "rgba(88,83,45,.09)" },
  "euphrates": { src: habitat7, tint: "rgba(78,83,45,.09)" },
  "ganges": { src: habitat8, tint: "rgba(93,88,61,.09)" },
  "danube": { src: habitat9, tint: "rgba(41,74,69,.07)" },
  "great-barrier-reef": { src: habitat10, tint: "rgba(15,79,98,.05)" },
  "seto-inland-sea": { src: habitat11, tint: "rgba(25,68,72,.08)" },
  "yellow-river-delta": { src: habitat12, tint: "rgba(90,85,53,.08)" },
};

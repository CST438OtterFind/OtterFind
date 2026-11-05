import type { JSX } from "react";
import type { CampusMapProps } from "./CampusMap.types";

/**
 * The campus map. The bundler picks CampusMap.web.tsx or CampusMap.native.tsx for each platform, and this
 * file gives TypeScript one type for both.
 */
export declare function CampusMap(props: CampusMapProps): JSX.Element;

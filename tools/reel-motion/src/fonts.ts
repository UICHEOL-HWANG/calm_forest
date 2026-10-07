import { loadFont as loadDisplay } from "@remotion/google-fonts/BlackHanSans";
import { loadFont as loadBody } from "@remotion/google-fonts/NotoSansKR";

export const DISPLAY = loadDisplay().fontFamily;
export const BODY = loadBody("normal", { weights: ["700", "900"] }).fontFamily;

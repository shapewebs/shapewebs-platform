import styles from "./color-swatch.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const ColorSwatch = createStyledComponent("span", styles.root);

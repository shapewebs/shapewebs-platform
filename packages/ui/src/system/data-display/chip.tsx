import styles from "./chip.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Chip = createStyledComponent("span", styles.root);

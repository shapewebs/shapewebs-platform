import styles from "./tooltip.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Tooltip = createStyledComponent("div", styles.root);

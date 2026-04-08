import styles from "./progress-bar.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const ProgressBar = createStyledComponent("div", styles.root);

import styles from "./separator.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Separator = createStyledComponent("hr", styles.root);

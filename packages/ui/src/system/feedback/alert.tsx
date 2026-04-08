import styles from "./alert.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Alert = createStyledComponent("div", styles.root);

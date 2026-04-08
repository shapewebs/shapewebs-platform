import styles from "./badge.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Badge = createStyledComponent("span", styles.root);

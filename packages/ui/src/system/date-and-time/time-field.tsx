import styles from "./time-field.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const TimeField = createStyledComponent("input", styles.root);

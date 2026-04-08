import styles from "./number-field.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const NumberField = createStyledComponent("input", styles.root);

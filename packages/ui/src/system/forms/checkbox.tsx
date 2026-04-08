import styles from "./checkbox.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Checkbox = createStyledComponent("input", styles.root);

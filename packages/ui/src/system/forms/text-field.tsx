import styles from "./text-field.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const TextField = createStyledComponent("input", styles.root);

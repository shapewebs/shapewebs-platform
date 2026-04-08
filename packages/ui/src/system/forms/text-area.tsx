import styles from "./text-area.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const TextArea = createStyledComponent("textarea", styles.root);

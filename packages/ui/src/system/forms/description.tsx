import styles from "./description.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Description = createStyledComponent("p", styles.root);

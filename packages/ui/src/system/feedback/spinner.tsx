import styles from "./spinner.module.css";
import { createStyledComponent } from "../_internal/create-styled-component";

export const Spinner = createStyledComponent("div", styles.root);
